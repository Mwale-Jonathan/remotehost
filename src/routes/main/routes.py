from flask import Blueprint, render_template, flash


main = Blueprint('main', __name__, url_prefix='/')

@main.get('/')
def home():
    flash('Message from flask', 'success')
    return render_template('main/lobby.html')
