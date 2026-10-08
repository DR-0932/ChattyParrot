import re 

def chunk_text(text, max_char = 1500, overlap=200):
    separators = ["\n\n","\n", ". "," "]

