#!/usr/bin/env python3
"""Verifica offline delle risorse Blogger incluse; soltanto libreria standard.

Non contatta siti, non modifica Blogger, non apre il DB e non scrive file.
Dalla radice del progetto: python3 docs/blog/verifica-evidenze.py
"""
from pathlib import Path
from hashlib import sha256
from xml.etree import ElementTree
import json
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{' + NS['w'] + '}'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def file_bytes(relative):
    p = (ROOT / relative).resolve()
    require(p.is_relative_to(ROOT) and p.is_file(), 'Percorso mancante o esterno: ' + relative)
    return p.read_bytes()


def check_item(item):
    data = file_bytes(item['file'])
    require(sha256(data).hexdigest() == item['sha256'], 'Hash diverso: ' + item['file'])
    if 'bytes' in item:
        require(len(data) == item['bytes'], 'Dimensione diversa: ' + item['file'])
    return data


def word_cell_code(table):
    row = table.find('w:tr', NS)
    require(row is not None, 'Tabella Word senza riga')
    cell = row.find('w:tc', NS)
    require(cell is not None, 'Tabella Word senza cella')
    paragraphs = cell.findall('w:p', NS)
    require(paragraphs, 'Cella Word senza paragrafi')
    lines = []
    for p in paragraphs:
        parts = []
        for el in p.iter():
            if el.tag == W + 't':
                parts.append(el.text or '')
            elif el.tag == W + 'tab':
                parts.append('\t')
            elif el.tag in (W + 'br', W + 'cr'):
                parts.append('\n')
        lines.append(''.join(parts))
    return '\n'.join(lines).encode('utf-8')


def run():
    index = json.loads(file_bytes('docs/blog/indice.json'))
    pkg = json.loads(file_bytes('package.json'))
    require(index['schema'] == 1, 'Schema indice non riconosciuto')
    docs = index['documenti']
    codes = index['codici_word']
    posts = index['post_aggiornati']
    require(len(docs) == 8 and len(codes) == 15 and len(posts) == 9, 'Numero risorse inatteso')
    require(sorted(c['numero'] for c in codes) == list(range(1,16)), 'Numerazione codici non valida')
    require(len({p['post_id'] for p in posts}) == 9, 'Post duplicati')
    require(sum(len(p['cornici']) for p in posts) == 13, 'Numero cornici post inatteso')
    for item in docs:
        check_item(item)
    for code in codes:
        data = check_item(code)
        m = re.search(rb"\b(?:var|let|const)\s+APP_URL\s*=\s*['\"]([^'\"]+)", data)
        require(m is not None and m.group(1).decode('utf-8') == code['app_url'], 'URL codice diverso: ' + str(code['numero']))
    for post in posts:
        for frame in post['cornici']:
            data = check_item(frame)
            m = re.search(rb"\b(?:var|let|const)\s+APP_URL\s*=\s*['\"]([^'\"]+)", data)
            require(m is not None and m.group(1).decode('utf-8') == frame['app_url'], 'URL cornice diverso: ' + frame['file'])

    word_path = next(x['file'] for x in docs if x['file'].endswith('.docx'))
    with zipfile.ZipFile(ROOT / word_path) as z:
        require(z.testzip() is None, 'Integrità DOCX non valida')
        xml = ElementTree.fromstring(z.read('word/document.xml'))
    body = xml.find('w:body', NS)
    require(body is not None, 'Documento Word senza body')
    tables = body.findall('w:tbl', NS)
    require(len(tables) == 16, 'Il Word deve contenere indice e 15 tabelle codice')
    for code in codes:
        n = code['numero']
        require(word_cell_code(tables[n]) == file_bytes(code['file']), 'Word e HTML diversi per Codice ' + str(n))

    latin = index['cornice_latino']
    first = next(c for c in codes if c['numero'] == 1)
    require(first['sha256'] == latin['sha256'] and first['app_url'] == latin['app_url'], 'Codice 1 non coerente col riscontro Latino')
    # Nelle varianti il cloner adatta il file attivo; gli archivi del blog restano storici.
    original = pkg['name'] == index['app_di_riferimento'] and not (ROOT / 'VARIANTE-DA-ADATTARE.md').exists()
    if original:
        check_item(latin)
    qa_file = next(x['file'] for x in docs if x['file'].endswith('VERIFICA-PUBBLICA-CORNICI-2026-11-07.json'))
    qa = json.loads(file_bytes(qa_file))
    require(qa['feed']['status'] == qa['mobile']['status'] == 'done', 'Controlli pubblici incompleti')
    ids = {p['post_id'] for p in posts}
    feed = qa['feed']['results']
    mobile = qa['mobile']['results']
    require({p['id'] for p in feed} == {p['id'] for p in mobile} == ids, 'Post nei riscontri non corrispondenti')
    require(all(all(f['style'] and f['script'] and f['html'] for f in p['frames']) for p in feed), 'Confronto feed non superato')
    require(all(p['ok'] for p in mobile), 'Controllo iniziale a 320 px non superato')
    simulated = json.loads(file_bytes('docs/blog/VERIFICA-SIMULATA-CORNICI-2026-11-07.json'))
    groups = json.loads(file_bytes('docs/blog/VERIFICA-CORNICI-AFFIANCATE-2026-11-07.json'))
    ping = json.loads(file_bytes('docs/blog/VERIFICA-PING-LENTO-2026-11-07.json'))
    require(simulated['scenarios'] == simulated['passed'] == 54 and simulated['checks'] == 4806 and not simulated['failed'], 'Verifiche simulate incomplete')
    require(len(groups) == 6 and all(x['ok'] for x in groups), 'Verifiche cornici affiancate incomplete')
    require(len(ping) == 2 and all(x['ok'] for x in ping), 'Verifica ping lento incompleta')
    return {
        'ok': True,
        'documenti_e_riscontri': len(docs),
        'word_codici_html_identici': len(codes),
        'post_cornici': sum(len(p['cornici']) for p in posts),
        'post_verificati': len(posts),
        'scenari_simulati_verificati': simulated['passed'],
        'cornice_latino_corrente_verificata': original,
        'avvertenza_variante': None if original else 'I documenti descrivono la sorgente; la cornice attiva del clone può avere un nuovo dominio.',
        'accessi_rete': False,
        'modifiche_blog': False,
    }


if __name__ == '__main__':
    try:
        print(json.dumps(run(), ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, IndexError, StopIteration, zipfile.BadZipFile, ElementTree.ParseError) as error:
        print('VERIFICA EVIDENZE FALLITA: ' + str(error), file=sys.stderr)
        sys.exit(1)

