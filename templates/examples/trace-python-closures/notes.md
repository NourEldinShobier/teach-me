# trace-python-closures
Format trace. Late binding of loop variables in Python lambdas, fixed with `lambda i=i: i`.
Frames: `.scratch/trace.py` (sys.settrace, Python 3.14.7) writes `frames.json`; `.scratch/assemble.py` fills `tmpl.html` into `lesson.src.html`.
Sources: Python FAQ (lambdas in a loop), Python reference execution model (resolution of names).
Figure: `tm.sim('late')` with loop length, lambda style and call time; one `model()` drives drawing, chips and hint.
