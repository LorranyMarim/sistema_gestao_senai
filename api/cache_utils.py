# cache_utils.py
import redis
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def invalidate_inst(inst_id: str):
    r.delete(f"inst:{inst_id}:bootstrap")
    r.incr(f"inst:{inst_id}:version")  # muda ETag
