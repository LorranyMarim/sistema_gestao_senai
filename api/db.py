from pymongo import MongoClient
import os

def get_mongo_db():
    mongo_url = "mongodb+srv://admin:<seni123>@senai-cluster.elygotq.mongodb.net/"
    client = MongoClient(mongo_url)
    return client["senai_betim_bd"]



