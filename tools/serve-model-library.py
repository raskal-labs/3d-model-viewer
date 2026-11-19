#!/usr/bin/env python3
"""Serve model bundles from a configured asset library through a private gateway."""

import argparse
import hashlib
import json
import mimetypes
import os
import re
import shutil
import struct
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

MODELS = {'.glb', '.gltf', '.obj', '.stl'}
TEXTURES = {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.bmp', '.ktx2'}
DEPENDENCIES = TEXTURES | {'.mtl', '.bin'}
MAX_BYTES = 64 * 1024 * 1024
BUNDLE_ROUTE = re.compile(r'/assets/([a-f0-9]{24})/(bundle\.json|thumbnail\.png|[0-9]{1,4})')


class Library:
    def __init__(self, root, aliases, thumbnails=None):
        self.root = root.resolve(strict=True)
        self.aliases = set(aliases)
        self.thumbnails = thumbnails.resolve(strict=True) if thumbnails else None
        self.models = {}
        self.bundles = {}
        self.scanned = -float('inf')
        self.lock = threading.Lock()

    def scan(self):
        if time.monotonic() - self.scanned < 15:
            return
        models = {}
        for collection in sorted(self.root.iterdir()):
            if collection.name.startswith('.') or not collection.is_dir():
                continue
            if collection.is_symlink() and collection.name not in self.aliases:
                continue
            directory = collection.resolve()
            for folder, dirs, files in os.walk(directory, followlinks=False):
                dirs[:] = [name for name in dirs if not name.startswith('.')]
                for name in files:
                    file = Path(folder, name)
                    if name.startswith('.') or file.suffix.lower() not in MODELS or file.is_symlink():
                        continue
                    try:
                        stat = file.stat()
                    except FileNotFoundError:
                        continue
                    if stat.st_size > MAX_BYTES or not file.is_file():
                        continue
                    path = (Path(collection.name) / file.relative_to(directory)).as_posix()
                    key = hashlib.sha256(path.encode()).hexdigest()[:24]
                    models[key] = (directory, file, {
                        'id': key, 'path': path, 'size': stat.st_size, 'modified': stat.st_mtime,
                    })
        self.models = models
        # An expired bundle is resolved again from its model and sidecars.
        self.bundles = {key: item for key, item in self.bundles.items()
                        if key in models and item[0] > time.monotonic()}
        self.scanned = time.monotonic()

    def catalog(self):
        with self.lock:
            self.scan()
            return sorted(
                (dict(entry, preview=self.thumbnail_path(key) is not None)
                 for key, (_, _, entry) in self.models.items()),
                key=lambda entry: entry['path'].casefold(),
            )

    def thumbnail_path(self, key):
        if not self.thumbnails:
            return None
        path = self.thumbnails / f'{key}.png'
        if path.is_file() and not path.is_symlink():
            return path
        return None

    def thumbnail(self, key):
        with self.lock:
            self.scan()
            path = self.thumbnail_path(key) if key in self.models else None
            if path is None:
                raise FileNotFoundError
            return check_file(self.thumbnails, path)

    def bundle(self, key, refresh=False):
        with self.lock:
            self.scan()
            if key not in self.models:
                raise FileNotFoundError
            cached = self.bundles.get(key)
            if cached and not refresh and cached[0] > time.monotonic():
                return cached[1]
            directory, model, entry = self.models[key]
            files = bundle_files(directory, model)
            collection = entry['path'].split('/', 1)[0]
            parts = [(directory, file, {
                'path': (Path(collection) / file.relative_to(directory)).as_posix(),
                'size': file.stat().st_size,
            }) for file in files]
            if sum(part[2]['size'] for part in parts) > MAX_BYTES:
                raise ValueError('The model and its sidecars exceed 64 MB.')
            self.bundles[key] = (time.monotonic() + 120, parts)
            return parts


def check_file(root, path):
    resolved = path.resolve()
    if (not resolved.is_relative_to(root) or resolved != path
            or any(part.startswith('.') for part in resolved.relative_to(root).parts)):
        raise ValueError('A referenced file is outside the model collection.')
    if not resolved.is_file():
        raise FileNotFoundError
    return resolved


def companion(root, base, reference, extensions, *, uri=False):
    if uri:
        url = urlsplit(reference)
        if url.scheme or url.netloc or url.query or url.fragment:
            raise ValueError('The model uses an external asset URL.')
        reference = unquote(url.path)
    candidate = Path(os.path.abspath(base / reference))
    if candidate.suffix.lower() not in extensions or not candidate.is_relative_to(root):
        raise ValueError('The model uses an unsupported sidecar.')
    return check_file(root, candidate)


def gltf_json(model):
    with model.open('rb') as file:
        if model.suffix.lower() == '.gltf':
            return json.loads(file.read(MAX_BYTES + 1))
        header = file.read(20)
        if len(header) < 20:
            raise ValueError('Incomplete GLB header.')
        magic, version, total, length, chunk_type = struct.unpack('<4sIIII', header)
        if magic != b'glTF' or version != 2 or chunk_type != 0x4e4f534a or length > min(total - 20, MAX_BYTES):
            raise ValueError('Invalid GLB header.')
        return json.loads(file.read(length))


def commands(file):
    with file.open(encoding='utf-8-sig', errors='replace') as lines:
        for line in lines:
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2:
                yield parts[0].lower(), parts[1]


def texture_name(value):
    # Match the texture transform options handled by the viewer's MTLLoader.
    tokens = value.split()
    for option, count in {'-bm': 2, '-s': 4, '-o': 4}.items():
        if option in tokens:
            i = tokens.index(option)
            del tokens[i:i + count]
    return ' '.join(tokens)


def bundle_files(root, model):
    files = [check_file(root, model)]
    suffix = model.suffix.lower()
    if suffix in {'.glb', '.gltf'}:
        document = gltf_json(model)
        for kind in ('buffers', 'images'):
            for resource in document.get(kind, []):
                reference = resource.get('uri', '')
                if reference and not reference.lower().startswith('data:'):
                    files.append(companion(root, model.parent, reference, DEPENDENCIES, uri=True))
    elif suffix == '.obj':
        mtl = next((value for name, value in commands(model) if name == 'mtllib'), None)
        if mtl:
            try:
                material = companion(root, model.parent, mtl, {'.mtl'})
            except FileNotFoundError:
                return files  # Geometry-only OBJ, as in the local file importer.
            files.append(material)
            for name, value in commands(material):
                if name in {'map_kd', 'map_ks', 'map_ke', 'norm', 'map_bump', 'bump', 'disp', 'map_d'}:
                    files.append(companion(root, material.parent, texture_name(value), TEXTURES))
    return list(dict.fromkeys(files))


class Handler(BaseHTTPRequestHandler):
    def send_asset_headers(self, content_type, size):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(size))
        self.send_header('Cache-Control', 'private, no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()

    def json_response(self, data):
        response = json.dumps(data, ensure_ascii=True).encode()
        self.send_asset_headers('application/json', len(response))
        self.wfile.write(response)

    def do_GET(self):
        if self.server.peers and self.client_address[0] not in self.server.peers:
            self.send_error(403)
            return
        path = urlsplit(self.path).path
        match = BUNDLE_ROUTE.fullmatch(path)
        try:
            if path == '/catalog.json':
                self.json_response({'assets': self.server.library.catalog()})
            elif match:
                key, resource = match.groups()
                if resource == 'thumbnail.png':
                    with self.server.library.thumbnail(key).open('rb') as source:
                        self.send_asset_headers('image/png', os.fstat(source.fileno()).st_size)
                        shutil.copyfileobj(source, self.wfile)
                    return
                parts = self.server.library.bundle(key, refresh=resource == 'bundle.json')
                if resource == 'bundle.json':
                    self.json_response({'files': [item[2] for item in parts]})
                else:
                    root, file, part = parts[int(resource)]
                    with check_file(root, file).open('rb') as source:
                        if os.fstat(source.fileno()).st_size != part['size']:
                            self.send_error(409, 'Asset changed; open it again.')
                            return
                        self.send_asset_headers(mimetypes.guess_type(file)[0] or 'application/octet-stream', part['size'])
                        shutil.copyfileobj(source, self.wfile)
            else:
                self.send_error(404)
        except (FileNotFoundError, IndexError):
            self.send_error(404, 'The model or a sidecar is unavailable.')
        except (ValueError, AttributeError, TypeError):
            self.send_error(422, 'The model bundle could not be read.')
        except (BrokenPipeError, ConnectionResetError):
            pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8771)
    parser.add_argument('--peer', action='append', default=[])
    parser.add_argument('--collection-link', action='append', default=[])
    parser.add_argument('--thumbnails', type=Path)
    args = parser.parse_args()
    with ThreadingHTTPServer((args.bind, args.port), Handler) as server:
        server.library = Library(args.root, args.collection_link, args.thumbnails)
        server.peers = set(args.peer)
        server.serve_forever()


if __name__ == '__main__':
    main()
