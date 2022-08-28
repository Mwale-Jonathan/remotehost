from flask import Blueprint
from .main.routes import main


routes = Blueprint('', __name__, url_prefix='/')
routes.register_blueprint(main)
