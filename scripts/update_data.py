"""
Atualiza todo o pipeline de dados do CUSTAVA QUANTO? em um único comando:

    .venv/Scripts/python scripts/update_data.py
    .venv/Scripts/python scripts/update_data.py --rapido   # pula ANP/IBGE (lentos)

Ordem: baixa os dados brutos mais recentes de cada fonte, depois consolida
tudo em dashboard_data.json e verifica/publica as notícias. Nenhum script
individual muda de comportamento — este arquivo só os chama em sequência e
para na primeira falha de uma etapa crítica (o build final).

--rapido pula ANP e IBGE (arquivos grandes, demoram minutos) e atualiza só o
que muda todo dia: câmbio/Selic (BCB), Ibovespa (Yahoo Finance) e a
consolidação/notícias. Use isso para "atualizar os indicadores de mercado
agora" sem esperar a ANP inteira baixar de novo.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from common import get_logger

logger = get_logger("update_data")
SCRIPTS_DIR = Path(__file__).resolve().parent
PYTHON = sys.executable


def rodar(script: str, *, critico: bool) -> bool:
    logger.info(f"=== {script} ===")
    resultado = subprocess.run([PYTHON, str(SCRIPTS_DIR / script)], cwd=SCRIPTS_DIR)
    ok = resultado.returncode == 0
    if not ok:
        nivel = "CRÍTICO" if critico else "não crítico"
        logger.warning(f"{script} terminou com erro ({nivel}) — código {resultado.returncode}")
    return ok


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rapido", action="store_true", help="pula ANP e IBGE (lentos); atualiza só BCB, Ibovespa, salário mínimo, Brent, notícias e a consolidação")
    args = ap.parse_args()

    etapas_download = [
        ("download_bcb.py", True),
        ("download_ibovespa.py", True),
        ("download_salario_minimo.py", False),
        ("download_brent.py", False),
    ]
    if not args.rapido:
        etapas_download = [("download_anp.py", False), ("download_ibge.py", False), *etapas_download]

    falhas_download = [nome for nome, critico in etapas_download if not rodar(nome, critico=critico)]

    # Se ANP/IBGE nunca rodaram (primeira vez, sem --rapido) e falharam, os
    # CSVs consolidados (combustiveis_final.csv/cesta_basica_final.csv) que
    # build_dashboard_data.py precisa não existem — sem eles não tem como
    # seguir. Em --rapido, build_dataset.py não é chamado de novo (os finais
    # já existem de uma execução anterior), então essa etapa é pulada.
    if not args.rapido:
        if not rodar("build_dataset.py", critico=True):
            logger.error("build_dataset.py falhou — abortando (dashboard_data.json não seria atualizado corretamente).")
            sys.exit(1)

    if not rodar("build_dashboard_data.py", critico=True):
        logger.error("build_dashboard_data.py falhou — dashboard_data.json pode estar desatualizado ou ausente.")
        sys.exit(1)

    # Notícias: melhor esforço. Sem internet ou com alguma página fora do ar,
    # o dashboard continua funcionando com o noticias.json já existente.
    rodar("build_news.py", critico=False)

    if falhas_download:
        logger.warning(f"Concluído com falhas não críticas em: {', '.join(falhas_download)}")
    else:
        logger.info("Pipeline concluído sem falhas.")


if __name__ == "__main__":
    sys.exit(main())
