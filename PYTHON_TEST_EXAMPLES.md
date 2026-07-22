# 🐍 Python Test Examples for CodeRunner

Once your updated deployment is live with Python support, test these examples:

## Example 1: Basic Python Hello World
```python
print("🎉 Python is working on CodeRunner!")
print("Current platform: CodeRunner Cloud")

# Math operations
x = 10
y = 20
print(f"Sum: {x} + {y} = {x + y}")
print(f"Product: {x} * {y} = {x * y}")
```

## Example 2: Interactive Input 
```python
name = input("What's your name? ")
print(f"Hello {name}! Welcome to CodeRunner!")

age = int(input("How old are you? "))
print(f"In 10 years, you'll be {age + 10} years old!")
```

## Example 3: Python with Loops
```python
print("🚀 Counting down:")
for i in range(5, 0, -1):
    print(f"T-minus {i}...")

print("🎆 Launch!")

# List operations
fruits = ["apple", "banana", "cherry"]
print("\nFruit list:")
for i, fruit in enumerate(fruits, 1):
    print(f"{i}. {fruit}")
```

## Example 4: File Operations (if supported)
```python
import os
print(f"Current directory: {os.getcwd()}")
print(f"Python version: {os.sys.version}")

# Create and read a temp file
with open("/tmp/test.txt", "w") as f:
    f.write("Hello from Python on CodeRunner!")

with open("/tmp/test.txt", "r") as f:
    content = f.read()
    print(f"File content: {content}")
```

## Example 5: Math and Libraries
```python
import math
import random

print("🔢 Math examples:")
print(f"π = {math.pi:.4f}")
print(f"e = {math.e:.4f}")
print(f"Square root of 16: {math.sqrt(16)}")

print("\n🎲 Random examples:")
for i in range(3):
    print(f"Random number {i+1}: {random.randint(1, 100)}")
```

## Expected Output
After the new deployment, you should see:
- ✅ Python 3.11: Available  
- ✅ Node.js 18: Available
- 🎉 Ready to execute: Python, Node.js

## Deployment Status
Your app will rebuild automatically on Render with the new Docker configuration that includes Python support!

Live at: https://coderunner-platform.onrender.com