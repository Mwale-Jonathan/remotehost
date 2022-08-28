from flask import Flask


def create_app(config_file='settings.py'):
    app = Flask(__name__)
    app.config.from_pyfile(config_file)

    from .routes import routes
    app.register_blueprint(routes)

    return app
