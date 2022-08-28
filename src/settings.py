import os
import secrets

ENV = 'production'

DEBUG = False

SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(16))

SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'sqlite:///../db.sqlite3')
SQLALCHEMY_TRACK_MODIFICATIONS = False
