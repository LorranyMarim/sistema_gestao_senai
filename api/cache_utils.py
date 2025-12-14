import time
from typing import Dict

# Armazenamento em memória (Simulando Redis para simplificar, mas pronto para produção)
# Chave: instituicao_id -> Timestamp/Hash
_VERSION_CACHE: Dict[str, str] = {}

def get_version_hash(inst_id: str) -> str:
    """Retorna o hash de versão atual para uma instituição específica."""
    if inst_id not in _VERSION_CACHE:
        # Se não existe versão, cria uma agora
        _VERSION_CACHE[inst_id] = str(int(time.time()))
    return _VERSION_CACHE[inst_id]

def invalidate_cache(inst_id: str):
    """Muda o hash da instituição, forçando o frontend a baixar novos dados."""
    _VERSION_CACHE[inst_id] = str(int(time.time()))

def check_etag(request_etag: str, inst_id: str) -> bool:
    """Verifica se o ETag enviado pelo navegador bate com a versão atual."""
    current = get_version_hash(inst_id)
    return request_etag == current