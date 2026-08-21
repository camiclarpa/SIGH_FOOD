# =============================================================================
# Optimiza las fotos de producto para la landing
# =============================================================================
#
# Los originales de DOCUMENTACION/CienciaDelSabor pesan ~2,2 MB cada uno. Cinco
# de esos son 11 MB solo en fotos: con datos moviles la pagina no llega a
# pintarse antes de que la persona se vaya, y el objetivo de la landing es justo
# lo contrario.
#
# De cada cono salen tres anchos y un marcador borroso:
#
#   ·  480 px  moviles pequenos
#   ·  760 px  tarjetas del catalogo, tablets y moviles con pantalla densa
#   · 1100 px  hero en escritorio
#   ·   24 px  marcador borroso en base64, para que el hueco no salga en blanco
#              mientras carga la foto de verdad
#
# Los tres anchos deben coincidir con ANCHOS_CONOS de src/lib/cargadorImagen.ts.
# Si se cambian aqui, hay que cambiarlos alli.
#
# Uso:
#   pip install pillow
#   python scripts/optimizar-conos.py
#
# Los marcadores se imprimen al final: se pegan a mano en el campo `marcador` de
# cada cono en src/components/b2c/datos.ts. Van incrustados en el codigo y no en
# un fichero aparte para no gastar una peticion mas en la primera pantalla.

import base64
import io
import pathlib

from PIL import Image, ImageFilter

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGEN = RAIZ.parent / 'DOCUMENTACION' / 'CienciaDelSabor'
DESTINO = RAIZ / 'public' / 'conos'

CONOS = {
    'spicy-volcano': 'Spicy_Volcano/Spicy_Volcano_Cone.png',
    'sweet-salty-caramel': 'Sweet&Salty_Caramel/Sweet & salty_caramel.png',
    'herbal-citrus': 'Herbal_Citrus/Herbal_Citrus_Cone.png',
    'smoked-cheese-truffle': 'Smoked_Cheese&Truffle/Smoked_Cheese&Truffle_Cone.png',
    'tropical-anise': 'Tropical_Anise/Tropical_Anise_Cone.png',
}

ANCHOS = [480, 760, 1100]
CALIDAD = 82


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    for viejo in DESTINO.glob('*.webp'):
        viejo.unlink()

    marcadores = {}
    antes = despues = 0

    for slug, rel in CONOS.items():
        src = ORIGEN / rel
        if not src.exists():
            print(f'  FALTA {src}')
            continue

        original = Image.open(src).convert('RGB')
        antes += src.stat().st_size
        pesos = []

        for ancho in ANCHOS:
            alto = round(original.height * ancho / original.width)
            salida = DESTINO / f'{slug}-{ancho}.webp'
            # method=6 es el modo mas lento de webp y el que mejor comprime. Da
            # igual tardar aqui: se ejecuta una vez y lo pagan todas las visitas.
            original.resize((ancho, alto), Image.LANCZOS).save(
                salida, 'WEBP', quality=CALIDAD, method=6
            )
            pesos.append(f'{ancho}px:{salida.stat().st_size // 1024}KB')
            despues += salida.stat().st_size

        mini = original.resize(
            (24, round(original.height * 24 / original.width)), Image.LANCZOS
        ).filter(ImageFilter.GaussianBlur(1))
        buf = io.BytesIO()
        mini.save(buf, 'WEBP', quality=45)
        marcadores[slug] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

        print(f'  {slug:24} ' + '  '.join(pesos))

    if antes:
        print(f'\n  {antes // 1024} KB -> {despues // 1024} KB '
              f'({100 - round(despues * 100 / antes)}% menos)')

    print('\n  Marcadores para src/components/b2c/datos.ts:\n')
    for slug, dato in marcadores.items():
        print(f'    {slug}:\n      {dato!r}\n')


if __name__ == '__main__':
    main()
