export const PYTHON_HARNESS = `
import contextlib
import io
import json
import traceback

_input = __ialab_input
_stdout = io.StringIO()
_stderr = io.StringIO()
_scope = {"__name__": "__main__"}
_error = None
_tests = []

try:
    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stderr):
        exec(compile(_input["code"], "<aluno>", "exec"), _scope, _scope)
except BaseException as _exc:
    _frames = [frame for frame in traceback.extract_tb(_exc.__traceback__) if frame.filename == "<aluno>"]
    _error = "".join(traceback.format_list(_frames)) + "".join(traceback.format_exception_only(type(_exc), _exc)).strip()

if _error is not None:
    _tests = [
        {"name": test["name"], "passed": False, "message": "O código gerou um erro antes dos testes"}
        for test in _input["tests"]
    ]
else:
    _scope["output"] = _stdout.getvalue()
    for _test in _input["tests"]:
        try:
            _test_scope = dict(_scope)
            exec(compile(_test["code"], "<teste>", "exec"), _test_scope, _test_scope)
            _tests.append({"name": _test["name"], "passed": True, "message": ""})
        except BaseException as _exc:
            _message = str(_exc) if isinstance(_exc, AssertionError) else f"{type(_exc).__name__}: {_exc}"
            _tests.append({"name": _test["name"], "passed": False, "message": _message})

json.dumps({
    "stdout": _stdout.getvalue(),
    "stderr": _stderr.getvalue(),
    "error": _error,
    "tests": _tests,
})
`;
