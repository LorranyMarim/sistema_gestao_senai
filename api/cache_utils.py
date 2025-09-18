# cache_utils.py
import json, asyncio
import redis
from functools import wraps
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def invalidate_inst(inst_id: str):
    r.delete(f"inst:{inst_id}:bootstrap")
    r.incr(f"inst:{inst_id}:version")  # muda ETag

def cached(key_builder, ttl: int = 60):
    def deco(fn):
        if asyncio.iscoroutinefunction(fn):
            @wraps(fn)
            async def _aw(*args, **kwargs):
                key = key_builder(*args, **kwargs)
                if data := r.get(key):
                    return json.loads(data)
                result = await fn(*args, **kwargs)
                r.setex(key, ttl, json.dumps(result, ensure_ascii=False))
                return result
            return _aw
        else:
            @wraps(fn)
            def _w(*args, **kwargs):
                key = key_builder(*args, **kwargs)
                if data := r.get(key):
                    return json.loads(data)
                result = fn(*args, **kwargs)
                r.setex(key, ttl, json.dumps(result, ensure_ascii=False))
                return result
            return _w
    return deco
