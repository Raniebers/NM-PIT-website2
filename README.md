# Newton-Raphson Root Finding PIT Project

Student: Raniel P. Beronilla  
Course and Section: BS Computer Engineering - 2B  
Subject: Numerical Methods PIT

## Features

- Flask web application
- Mathematical discussion and short history
- Step-by-step procedure
- Two worked examples with tolerance 10^-6
- Interactive Newton-Raphson calculator
- Auto-derivative feature using SymPy
- Supports x, y, or z as selected variable
- Saved solution history using localStorage
- Figure/graph dropdown for plotted function and tangent lines
- Print options for result only, solution, and graph

## Run Locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python api/index.py
```

Open:

```txt
http://127.0.0.1:5000
```

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Deploy.
4. Copy the Vercel link for submission.

## Safe Input Parsing

The calculator validates expressions using Python AST and only allows selected mathematical functions, constants, and the selected variable. The derivative is generated using SymPy, while the numerical Newton-Raphson iterations are implemented manually.
