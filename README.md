# JS Object ⇄ JSON Converter

A simple JavaScript utility that converts **JavaScript Objects to JSON** and **JSON back to JavaScript Objects**.
This project demonstrates how serialization and deserialization work in JavaScript using built-in methods.

---

## 📌 Features

* Convert **JavaScript Object → JSON**
* Convert **JSON → JavaScript Object**
* Lightweight and beginner friendly
* Uses native JavaScript methods

---

## 🚀 Demo

Example conversion:

### JavaScript Object → JSON

```javascript
const user = {
  name: "John",
  age: 25,
  isAdmin: false
};

const jsonData = JSON.stringify(user);
console.log(jsonData);
```

Output:

```json
{"name":"John","age":25,"isAdmin":false}
```

---

### JSON → JavaScript Object

```javascript
const jsonString = '{"name":"John","age":25,"isAdmin":false}';

const obj = JSON.parse(jsonString);
console.log(obj);
```

Output:

```javascript
{ name: "John", age: 25, isAdmin: false }
```

---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/utkarshcs18/object-parser.git
```


## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

---

## 📜 License

This project is licensed under the MIT License.

---

⭐ If you found this project helpful, consider giving it a star!
