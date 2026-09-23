"""Gera os retratos dos presidentes usados no dashboard, com tratamento idêntico.

Entrada: dashboard/assets/presidents/originais/*.jpg — fotos oficiais do
Palácio do Planalto (CC BY 2.0, via Wikimedia Commons; créditos em
build_dashboard_data.py). Saída: dashboard/assets/presidents/<nome>.jpg.

Tratamento (o mesmo para os dois, sem alterar a aparência das pessoas):
  1. recorte quadrado com o rosto na mesma escala e posição (linha dos olhos
     a ~42% da altura, rosto ocupando ~50% da largura);
  2. redimensionamento para 720x720 px (nítido até ~360 px de tela em 2x);
  3. conversão para monocromático com leve ajuste de contraste — tira as
     cores de fundo (bandeira, faixa presidencial) para que a única cor
     associada a cada período seja a de identificação do próprio site.
"""
from pathlib import Path

from PIL import Image, ImageOps

PASTA = Path(__file__).resolve().parent.parent / "dashboard" / "assets" / "presidents"

# (esquerda, topo, direita, base) no arquivo original — medidos para igualar
# a escala do rosto entre as duas fotos.
RECORTES = {
    "bolsonaro": (51, 29, 951, 929),
    "lula": (122, 28, 856, 762),
}
LADO = 720


def processar(nome: str, caixa: tuple[int, int, int, int]) -> None:
    img = Image.open(PASTA / "originais" / f"{nome}.jpg").convert("RGB")
    img = img.crop(caixa).resize((LADO, LADO), Image.LANCZOS)
    img = ImageOps.grayscale(img)
    img = ImageOps.autocontrast(img, cutoff=0.5)
    img.convert("RGB").save(PASTA / f"{nome}.jpg", quality=90, optimize=True, progressive=True)
    print(f"{nome}: {caixa} -> {LADO}x{LADO}")


if __name__ == "__main__":
    for nome, caixa in RECORTES.items():
        processar(nome, caixa)
