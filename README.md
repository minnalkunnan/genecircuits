## Getting Started

1. Clone repo
2. Setup Backend
   1. Go to backend folder `cd /backend`
   2. Create a python environment of your choosing (must be `>=python3.10`, though in prod I will probably use python3.12)
      1. For this, I recommend virtualenv.
      2. Run `python3.xx -m venv flask-env`
   3. `pip install -r requirements.txt`
   4. `pyinstaller app.spec`
3. Setup Frontend
   1. Go back to the top directory
   2. Check you are using the correct versions of `node` and `npm`
      - Use `node` version 18 and `npm` version 10
      - To check your versions, run `node -v` or `npm -v`
      - To change your version, run `nvm use 18`
   3. Run: `npm i`
4. Start app: `npm run start`

## Testing

To run the backend tests, follow these steps:
1. Navigate to backend
2. Create a python environment: `python3.12 -m venv flask-env`
3. Activate the environment: `source flask-env/bin/activate`
4. Run `pip install -r requirements.txt`
5. Navigate to backend/test/simulation_test_data and run `./generate.sh`
6. Navigate back to backend/test and run `pytest -v <test_file>`. Available test files are:
   - test_gate.py
   - test_ipc_server.py
   - test_parser.py
   - test_protein.py
   - test_repressilator.py
   - test_simulator.py
   - test_toggle_switch.py
7. To run a specific test within a test file, run ​`​pytest -v <test_file>::<test_name>`.

To see backend coverage information, follow these steps assuming, steps 1-4 above are complete:
1. Navigate to backend/
2. Run `coverage run -m pytest -v`
3. To generate the report in terminal on coverage, run `coverage report`
4. To generate the HTML clickable file that so you can see which lines are/aren’t being covered, run `coverage html`
5. To see which lines aren’t being covered and in which files, run `coverage report --show-missing`

To run the frontend tests, run `npm i` then `npm test` at the top level directory.

