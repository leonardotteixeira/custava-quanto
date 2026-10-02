"""Gera os retratos dos presidentes usados no dashboard, com tratamento idêntico.

Entrada: dashboard/assets/presidents/originais/*.jpg — fotos oficiais do
Palácio do Planalto (CC BY 2.0, via Wikimedia Commons; créditos em
build_dashboard_data.py). Saída: dashboard/assets/presidents/<nome>.jpg.

Tratamento (o mesmo para os dois, sem alterar a aparência das pessoas):
  1. recorte quadrado com o rosto na mesma escala e posição (linha dos olhos
     a ~42% da altura, rosto ocupando ~50% da largura);
  2. redimensionamento para 720x720 px (nítido até ~360 px de tela em 2x);
  3. leve dessaturação com ajuste de contraste — reduz sem eliminar as
     cores de fundo (bandeira, faixa presidencial), seguindo a diretriz de
     marca do projeto ("tratamento levemente dessaturado, nunca preto e
     branco puro"). DESSATURACAO = 0 (colorido original) a
     1 (P&B total).
  4. versões pré-reduzidas (140, 210 e 280 px) para o tamanho real de exibição:
     o retrato aparece com ~70 px de altura, e o navegador reduzindo 720 -> 70
     de uma vez gera serrilhado. Cada versão é reduzida aqui com LANCZOS, em
     etapas de no máximo 2x, com leve realce de nitidez, e vai no `srcset`
     (descritores de largura, para nunca ampliar a menor versão).
"""
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

PASTA = Path(__file__).resolve().parent.parent / "dashboard" / "assets" / "presidents"

# (esquerda, topo, direita, base) no arquivo original — medidos para igualar
# a escala do rosto entre as duas fotos.
RECORTES = {
    "bolsonaro": (51, 29, 951, 929),
    "lula": (122, 28, 856, 762),
}
LADO = 720
DESSATURACAO = 0.35
# Lados (px) das versões pré-reduzidas. O retrato aparece com 56x70 px (40x50 no
# celular). Não há versão de 70 px de propósito: em telas com escala 125% ou 150%
# (comum no Windows) o navegador escolheria a menor e a esticaria, que é o que
# deixa o retrato pixelado. Com 140 px o navegador sempre reduz, nunca amplia
# (até tela 2,5x); 210 e 280 cobrem 3x e 4x.
VERSOES = {"140": 140, "210": 210, "280": 280}


def processar(nome: str, caixa: tuple[int, int, int, int]) -> None:
    img = Image.open(PASTA / "originais" / f"{nome}.jpg").convert("RGB")
    img = img.crop(caixa).resize((LADO, LADO), Image.LANCZOS)
    cinza = ImageOps.grayscale(img).convert("RGB")
    img = Image.blend(img, cinza, DESSATURACAO)
    img = ImageOps.autocontrast(img, cutoff=0.5)
    img.save(PASTA / f"{nome}.jpg", quality=90, optimize=True, progressive=True)
    print(f"{nome}: {caixa} -> {LADO}x{LADO}, dessaturação {DESSATURACAO:.0%}")
    for dens, lado in VERSOES.items():
        # etapas de no máximo 2x mantêm o filtro fiel; o realce compensa o suavizado
        pq = img
        while pq.width // 2 > lado:
            pq = pq.resize((pq.width // 2, pq.height // 2), Image.LANCZOS)
        pq = pq.resize((lado, lado), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.7, percent=70, threshold=2))
        pq.save(PASTA / f"{nome}-{lado}.jpg", quality=92, optimize=True, progressive=True)
        print(f"  {dens}: {nome}-{lado}.jpg")


if __name__ == "__main__":
    for nome, caixa in RECORTES.items():
        processar(nome, caixa)
