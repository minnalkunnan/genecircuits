# Generate txt files by running the simulations
#!/bin/bash

echo "Running xor.py..."
python xor.py

echo "Running i1_ffl.py..."
python i1_ffl.py

echo "Running repressilator.py..."
python repressilator.py

echo "Running toggle_switch.py..."
python toggle_switch.py