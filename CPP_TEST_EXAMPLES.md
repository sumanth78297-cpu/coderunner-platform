# 🔧 C++ Test Examples for CodeRunner

Test these C++ examples on your CodeRunner platform with full compilation support:

## Example 1: Basic C++ Hello World
```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "🎉 C++ is working on CodeRunner!" << endl;
    cout << "Compilation successful!" << endl;
    
    // Math operations
    int x = 10, y = 20;
    cout << "Sum: " << x << " + " << y << " = " << x + y << endl;
    cout << "Product: " << x << " * " << y << " = " << x * y << endl;
    
    return 0;
}
```

## Example 2: Interactive Input
```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;
    
    cout << "What's your name? ";
    getline(cin, name);
    
    cout << "Hello " << name << "! Welcome to CodeRunner!" << endl;
    
    cout << "How old are you? ";
    cin >> age;
    
    cout << "In 10 years, you'll be " << age + 10 << " years old!" << endl;
    
    return 0;
}
```

## Example 3: C++ with Classes
```cpp
#include <iostream>
#include <string>
using namespace std;

class Calculator {
private:
    string name;
    
public:
    Calculator(string n) : name(n) {}
    
    int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    
    void greet() {
        cout << "🔧 " << name << " Calculator Ready!" << endl;
    }
};

int main() {
    Calculator calc("CodeRunner");
    calc.greet();
    
    cout << "Factorial of 5: " << calc.factorial(5) << endl;
    cout << "Factorial of 7: " << calc.factorial(7) << endl;
    
    return 0;
}
```

## Example 4: STL Containers
```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <string>
using namespace std;

int main() {
    cout << "🚀 C++ STL Demo" << endl;
    
    vector<int> numbers = {64, 34, 25, 12, 22, 11, 90};
    
    cout << "Original array: ";
    for(int n : numbers) cout << n << " ";
    cout << endl;
    
    sort(numbers.begin(), numbers.end());
    
    cout << "Sorted array: ";
    for(int n : numbers) cout << n << " ";
    cout << endl;
    
    // Vector operations
    numbers.push_back(100);
    cout << "After adding 100: ";
    for(int n : numbers) cout << n << " ";
    cout << endl;
    
    return 0;
}
```

## Example 5: File I/O (if supported)
```cpp
#include <iostream>
#include <fstream>
#include <string>
using namespace std;

int main() {
    // Write to file
    ofstream outFile("/tmp/cpp_test.txt");
    outFile << "Hello from C++ on CodeRunner!" << endl;
    outFile << "Compilation and execution successful!" << endl;
    outFile.close();
    
    // Read from file
    ifstream inFile("/tmp/cpp_test.txt");
    string line;
    
    cout << "📄 File contents:" << endl;
    while(getline(inFile, line)) {
        cout << line << endl;
    }
    inFile.close();
    
    cout << "✅ File I/O operations completed!" << endl;
    return 0;
}
```

## Expected Build Process

When you run C++ code on CodeRunner, you'll see:
1. **"Compiling CPP code..."** - g++ compilation step
2. **"Running CPP program..."** - Execution of compiled binary
3. **Program output** - Your C++ program's results

## Compilation Features
- ✅ **g++ compiler** with C++17 support
- ✅ **STL libraries** available
- ✅ **Interactive input/output** 
- ✅ **File I/O operations**
- ✅ **Object-oriented programming**
- ✅ **Template support**

Perfect for demonstrating **systems programming** and **performance-oriented** coding skills!

Live at: https://coderunner-platform.onrender.com