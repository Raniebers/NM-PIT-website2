from __future__ import annotations

import ast
import math
import os
from typing import Any, Callable

import sympy as sp
from flask import Flask, jsonify, render_template, request

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
    static_url_path="/static",
)

ALLOWED_FUNCTIONS = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "sqrt": math.sqrt,
    "log": math.log,
    "ln": math.log,
    "exp": math.exp,
    "abs": abs,
}

SYMPY_FUNCTIONS = {
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "sqrt": sp.sqrt,
    "log": sp.log,
    "ln": sp.log,
    "exp": sp.exp,
    "abs": sp.Abs,
}

ALLOWED_CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
}

ALLOWED_VARIABLES = {"x", "y", "z"}

ALLOWED_NODES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Call,
    ast.Name,
    ast.Load,
    ast.Constant,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Pow,
    ast.USub,
    ast.UAdd,
    ast.Mod,
)


class SafeExpressionError(ValueError):
    pass


def normalize_expression(expression: str) -> str:
    """Normalize user math input before parsing.

    This accepts classroom-style input such as 3x^2, 2(x+1),
    and x(x-1) by inserting the needed multiplication symbol.
    """
    import re

    text = expression.strip().replace("^", "**")
    text = re.sub(r"(\d)([xyz]\b)", r"\1*\2", text)
    text = re.sub(r"(\d)([A-Za-z]+\()", r"\1*\2", text)
    text = re.sub(r"(\d)\(", r"\1*(", text)
    text = re.sub(r"\)(\d)", r")*\1", text)
    text = re.sub(r"\)([xyz]\b)", r")*\1", text)
    text = re.sub(r"([xyz])\(", r"\1*(", text)
    return text


def validate_expression(expression: str, variable: str) -> ast.Expression:
    if variable not in ALLOWED_VARIABLES:
        raise SafeExpressionError("Variable must be x, y, or z.")

    normalized = normalize_expression(expression)

    try:
        parsed = ast.parse(normalized, mode="eval")
    except SyntaxError as exc:
        raise SafeExpressionError("Invalid mathematical expression.") from exc

    for node in ast.walk(parsed):
        if not isinstance(node, ALLOWED_NODES):
            raise SafeExpressionError(
                "Expression contains unsupported symbols or operations."
            )

        if isinstance(node, ast.Name):
            allowed_names = {variable, *ALLOWED_FUNCTIONS.keys(), *ALLOWED_CONSTANTS.keys()}
            if node.id not in allowed_names:
                raise SafeExpressionError(
                    f"Unsupported name: {node.id}. Use only the selected variable ({variable})."
                )

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise SafeExpressionError("Only simple function calls are allowed.")
            if node.func.id not in ALLOWED_FUNCTIONS:
                raise SafeExpressionError(f"Unsupported function: {node.func.id}")

    return parsed


def make_function(expression: str, variable: str) -> Callable[[float], float]:
    parsed = validate_expression(expression, variable)
    compiled = compile(parsed, filename="<safe_math_expression>", mode="eval")

    def function(value: float) -> float:
        safe_scope: dict[str, Any] = {
            variable: value,
            **ALLOWED_FUNCTIONS,
            **ALLOWED_CONSTANTS,
        }
        return float(eval(compiled, {"__builtins__": {}}, safe_scope))

    return function


def sympify_expression(expression: str, variable: str) -> sp.Expr:
    if variable not in ALLOWED_VARIABLES:
        raise SafeExpressionError("Variable must be x, y, or z.")

    symbol = sp.Symbol(variable)
    local_dict = {
        variable: symbol,
        "pi": sp.pi,
        "e": sp.E,
        **SYMPY_FUNCTIONS,
    }

    try:
        return sp.sympify(normalize_expression(expression), locals=local_dict)
    except (sp.SympifyError, TypeError, SyntaxError) as exc:
        raise SafeExpressionError("Unable to read the expression for symbolic differentiation.") from exc


def derivative_expression(function_expression: str, variable: str) -> dict[str, str]:
    validate_expression(function_expression, variable)
    symbol = sp.Symbol(variable)
    expression = sympify_expression(function_expression, variable)
    derivative = sp.diff(expression, symbol)

    return {
        "plain": str(derivative).replace("**", "^"),
        "latex_function": sp.latex(expression),
        "latex_derivative": sp.latex(derivative),
        "latex_rule": rf"\frac{{d}}{{d{variable}}}\left({sp.latex(expression)}\right)={sp.latex(derivative)}",
    }


def create_graph_data(
    function: Callable[[float], float],
    derivative: Callable[[float], float],
    iterations: list[dict[str, float]],
) -> dict[str, Any]:
    xs = [item["xn"] for item in iterations] + [item["next_x"] for item in iterations]
    if not xs:
        return {"points": [], "tangents": []}

    min_x = min(xs)
    max_x = max(xs)
    span = max(max_x - min_x, 1.0)
    left = min_x - span * 0.65
    right = max_x + span * 0.65

    points = []
    for index in range(100):
        x_value = left + (right - left) * index / 99
        try:
            y_value = function(x_value)
            if math.isfinite(y_value):
                points.append({"x": x_value, "y": y_value})
        except (ValueError, OverflowError, ZeroDivisionError):
            continue

    tangents = []
    for item in iterations[:6]:
        xn = item["xn"]
        try:
            fx = function(xn)
            dfx = derivative(xn)
            line_left = xn - span * 0.3
            line_right = xn + span * 0.3
            tangents.append(
                {
                    "x0": xn,
                    "y0": fx,
                    "x1": line_left,
                    "y1": fx + dfx * (line_left - xn),
                    "x2": line_right,
                    "y2": fx + dfx * (line_right - xn),
                    "next_x": item["next_x"],
                }
            )
        except (ValueError, OverflowError, ZeroDivisionError):
            continue

    return {"points": points, "tangents": tangents, "root": iterations[-1]["next_x"]}


def newton_raphson(
    function_expression: str,
    derivative_expression_text: str,
    variable: str,
    initial_guess: float,
    tolerance: float,
    max_iterations: int,
) -> dict[str, Any]:
    if tolerance <= 0:
        raise ValueError("Tolerance must be greater than zero.")
    if max_iterations <= 0:
        raise ValueError("Maximum iterations must be greater than zero.")

    function = make_function(function_expression, variable)
    derivative = make_function(derivative_expression_text, variable)

    iterations = []
    current = initial_guess

    for iteration_number in range(max_iterations):
        fx = function(current)
        dfx = derivative(current)

        if abs(dfx) < 1e-14:
            raise ZeroDivisionError(
                "The derivative became zero or too close to zero. Newton-Raphson cannot continue."
            )

        next_value = current - (fx / dfx)
        error = abs(next_value - current)

        iterations.append(
            {
                "n": iteration_number,
                "xn": current,
                "fx": fx,
                "dfx": dfx,
                "next_x": next_value,
                "error": error,
            }
        )

        if error < tolerance:
            return {
                "root": next_value,
                "iterations": iterations,
                "graph": create_graph_data(function, derivative, iterations),
                "converged": True,
                "message": "The method converged successfully.",
            }

        current = next_value

    return {
        "root": current,
        "iterations": iterations,
        "graph": create_graph_data(function, derivative, iterations),
        "converged": False,
        "message": "Maximum iterations reached before satisfying the tolerance.",
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/derive", methods=["POST"])
def derive():
    data = request.get_json(silent=True) or {}
    try:
        expression = str(data.get("function", "")).strip()
        variable = str(data.get("variable", "x")).strip()
        if not expression:
            raise ValueError("Please enter a function first.")
        result = derivative_expression(expression, variable)
        return jsonify({"success": True, **result})
    except (ValueError, SafeExpressionError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


@app.route("/calculate", methods=["POST"])
def calculate():
    data = request.get_json(silent=True) or {}
    try:
        function_expression = str(data.get("function", "")).strip()
        derivative_expression_text = str(data.get("derivative", "")).strip()
        variable = str(data.get("variable", "x")).strip()
        initial_guess = float(data.get("initial_guess", 0))
        tolerance = float(data.get("tolerance", 1e-6))
        max_iterations = int(data.get("max_iterations", 25))

        if not function_expression:
            raise ValueError("Please enter a function.")
        if not derivative_expression_text:
            raise ValueError("Please enter or auto-calculate the derivative.")

        symbolic = derivative_expression(function_expression, variable)
        result = newton_raphson(
            function_expression=function_expression,
            derivative_expression_text=derivative_expression_text,
            variable=variable,
            initial_guess=initial_guess,
            tolerance=tolerance,
            max_iterations=max_iterations,
        )

        return jsonify(
            {
                "success": True,
                "function": function_expression,
                "derivative": derivative_expression_text,
                "variable": variable,
                "initial_guess": initial_guess,
                "tolerance": tolerance,
                "max_iterations": max_iterations,
                "symbolic": symbolic,
                **result,
            }
        )
    except (ValueError, SafeExpressionError, ZeroDivisionError, OverflowError) as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


if __name__ == "__main__":
    app.run(debug=True)
