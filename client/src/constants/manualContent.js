export const MANUAL_TOPICS = [
  {
    key: "input",
    title: "Input Methods",
    snippets: {
      javascript: `// In JavaScript (Node.js), you can read from standard input using the 'fs' module.
const fs = require('fs');

const input = fs.readFileSync('/dev/stdin', 'utf-8').trim();
const lines = input.split('\\n');

// Process lines
lines.forEach(line => {
    console.log(line);
});`,
      python: `# In Python, you can read from standard input using 'sys' or 'input()'.
import sys

# Read all lines efficiently
input_data = sys.stdin.read().splitlines()

# Process lines
for line in input_data:
    print(line)`,
      java: `// In Java, use Scanner or BufferedReader.
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextLine()) {
            String line = sc.nextLine();
            System.out.println(line);
        }
    }
}`,
      cpp: `// In C++, use std::cin and getline.
#include <iostream>
#include <string>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    string line;
    while (getline(cin, line)) {
        cout << line << "\\n";
    }
    return 0;
}`,
      c: `// In C, use scanf or fgets.
#include <stdio.h>

int main() {
    char line[256];
    while (fgets(line, sizeof(line), stdin)) {
        printf("%s", line);
    }
    return 0;
}`
    }
  },
  {
    key: "arrays_lists",
    title: "Arrays & Lists",
    snippets: {
      javascript: `// JavaScript arrays act as dynamic lists.
let arr = [1, 2, 3];

// Insertion
arr.push(4); // End
arr.unshift(0); // Beginning
arr.splice(2, 0, 99); // At index 2

// Deletion
arr.pop(); // End
arr.shift(); // Beginning
arr.splice(2, 1); // At index 2

// Search
let index = arr.indexOf(99);

console.log(arr);`,
      python: `# Python lists are dynamic arrays.
arr = [1, 2, 3]

# Insertion
arr.append(4) # End
arr.insert(0, 0) # Beginning
arr.insert(2, 99) # At index 2

# Deletion
arr.pop() # End
arr.pop(0) # Beginning
arr.remove(99) # By value

# Search
index = arr.index(2) if 2 in arr else -1

print(arr)`,
      java: `// Java has fixed-size Arrays and dynamic ArrayLists.
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> list = new ArrayList<>();
        
        // Insertion
        list.add(1);
        list.add(2);
        list.add(3);
        list.add(0, 0); // Beginning
        list.add(2, 99); // At index 2
        
        // Deletion
        list.remove(list.size() - 1); // End
        list.remove(0); // Beginning
        list.remove(Integer.valueOf(99)); // By value
        
        // Search
        int index = list.indexOf(2);
        
        System.out.println(list);
    }
}`,
      cpp: `// C++ uses std::vector for dynamic arrays.
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> vec = {1, 2, 3};
    
    // Insertion
    vec.push_back(4); // End
    vec.insert(vec.begin(), 0); // Beginning
    vec.insert(vec.begin() + 2, 99); // At index 2
    
    // Deletion
    vec.pop_back(); // End
    vec.erase(vec.begin()); // Beginning
    
    // Search
    auto it = find(vec.begin(), vec.end(), 2);
    int index = (it != vec.end()) ? distance(vec.begin(), it) : -1;
    
    for(int x : vec) cout << x << " ";
    return 0;
}`,
      c: `// C arrays are fixed size. Must manage manually.
#include <stdio.h>

int main() {
    int arr[100];
    int count = 0;
    
    // Insert at end
    arr[count++] = 1;
    arr[count++] = 2;
    arr[count++] = 3;
    
    // Search
    int target = 2, index = -1;
    for(int i = 0; i < count; i++) {
        if(arr[i] == target) {
            index = i;
            break;
        }
    }
    
    for(int i = 0; i < count; i++) printf("%d ", arr[i]);
    return 0;
}`
    }
  },
  {
    key: "matrices",
    title: "Matrices (2D Arrays)",
    snippets: {
      javascript: `// Matrices in JS are arrays of arrays.
let rows = 3, cols = 3;
let matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

matrix[0][1] = 5;

for (let r = 0; r < rows; r++) {
    console.log(matrix[r].join(" "));
}`,
      python: `# Matrices in Python are lists of lists.
rows, cols = 3, 3
matrix = [[0 for _ in range(cols)] for _ in range(rows)]

matrix[0][1] = 5

for row in matrix:
    print(" ".join(map(str, row)))`,
      java: `// 2D Arrays in Java.
public class Main {
    public static void main(String[] args) {
        int rows = 3, cols = 3;
        int[][] matrix = new int[rows][cols];
        
        matrix[0][1] = 5;
        
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                System.out.print(matrix[r][c] + " ");
            }
            System.out.println();
        }
    }
}`,
      cpp: `// 2D Vectors in C++.
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int rows = 3, cols = 3;
    vector<vector<int>> matrix(rows, vector<int>(cols, 0));
    
    matrix[0][1] = 5;
    
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            cout << matrix[r][c] << " ";
        }
        cout << "\\n";
    }
    return 0;
}`,
      c: `// 2D Arrays in C.
#include <stdio.h>

int main() {
    int rows = 3, cols = 3;
    int matrix[3][3] = {0}; // Initialize to 0
    
    matrix[0][1] = 5;
    
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            printf("%d ", matrix[r][c]);
        }
        printf("\\n");
    }
    return 0;
}`
    }
  },
  {
    key: "tuples",
    title: "Tuples",
    snippets: {
      javascript: `// JavaScript doesn't have native tuples, use arrays or objects.
let tuple = [1, "hello", true];

// Unpacking
let [id, name, isActive] = tuple;
console.log(id, name, isActive);`,
      python: `# Python has native immutable tuples.
my_tuple = (1, "hello", True)

# Unpacking
id, name, is_active = my_tuple
print(id, name, is_active)`,
      java: `// Java doesn't have native tuples, use a class or Record (Java 14+).
record Tuple(int id, String name, boolean isActive) {}

public class Main {
    public static void main(String[] args) {
        Tuple t = new Tuple(1, "hello", true);
        System.out.println(t.id() + " " + t.name() + " " + t.isActive());
    }
}`,
      cpp: `// C++ has std::tuple.
#include <iostream>
#include <tuple>
#include <string>
using namespace std;

int main() {
    tuple<int, string, bool> my_tuple(1, "hello", true);
    
    // Access
    cout << get<0>(my_tuple) << " " << get<1>(my_tuple) << "\\n";
    
    // Unpacking (C++17 structured bindings)
    auto [id, name, isActive] = my_tuple;
    cout << id << " " << name << "\\n";
    
    return 0;
}`,
      c: `// C uses structs for tuple-like behavior.
#include <stdio.h>
#include <stdbool.h>

struct Tuple {
    int id;
    char name[20];
    bool isActive;
};

int main() {
    struct Tuple t = {1, "hello", true};
    printf("%d %s %d\\n", t.id, t.name, t.isActive);
    return 0;
}`
    }
  },
  {
    key: "sets",
    title: "Sets",
    snippets: {
      javascript: `// JavaScript Set for unique values.
let set = new Set();

set.add(1);
set.add(2);
set.add(1); // Duplicate ignored

console.log(set.has(2)); // true
set.delete(2);

for (let val of set) {
    console.log(val);
}`,
      python: `# Python Sets for unique values.
my_set = set()

my_set.add(1)
my_set.add(2)
my_set.add(1) # Duplicate ignored

print(2 in my_set) # True
my_set.remove(2)

for val in my_set:
    print(val)`,
      java: `// Java HashSet.
import java.util.HashSet;

public class Main {
    public static void main(String[] args) {
        HashSet<Integer> set = new HashSet<>();
        
        set.add(1);
        set.add(2);
        set.add(1); // Duplicate ignored
        
        System.out.println(set.contains(2)); // true
        set.remove(2);
        
        for (int val : set) {
            System.out.println(val);
        }
    }
}`,
      cpp: `// C++ std::set (ordered) or std::unordered_set.
#include <iostream>
#include <unordered_set>
using namespace std;

int main() {
    unordered_set<int> set;
    
    set.insert(1);
    set.insert(2);
    set.insert(1); // Duplicate ignored
    
    cout << (set.count(2) > 0) << "\\n"; // 1 (true)
    set.erase(2);
    
    for (int val : set) {
        cout << val << "\\n";
    }
    return 0;
}`,
      c: `// C does not have native sets. 
// Requires manual implementation using a Hash Table or an Array.
// See Hash Map section for foundational logic.`
    }
  },
  {
    key: "hashmaps",
    title: "Hash Maps",
    snippets: {
      javascript: `// Use JavaScript Objects or Map.
let map = new Map();

map.set("key1", 100);
map.set("key2", 200);

console.log(map.get("key1")); // 100
console.log(map.has("key2")); // true
map.delete("key2");

for (let [key, val] of map) {
    console.log(key, val);
}`,
      python: `# Python Dictionaries.
my_dict = {}

my_dict["key1"] = 100
my_dict["key2"] = 200

print(my_dict.get("key1")) # 100
print("key2" in my_dict) # True
del my_dict["key2"]

for key, val in my_dict.items():
    print(key, val)`,
      java: `// Java HashMap.
import java.util.HashMap;

public class Main {
    public static void main(String[] args) {
        HashMap<String, Integer> map = new HashMap<>();
        
        map.put("key1", 100);
        map.put("key2", 200);
        
        System.out.println(map.get("key1")); // 100
        System.out.println(map.containsKey("key2")); // true
        map.remove("key2");
        
        for (String key : map.keySet()) {
            System.out.println(key + " " + map.get(key));
        }
    }
}`,
      cpp: `// C++ std::unordered_map.
#include <iostream>
#include <unordered_map>
#include <string>
using namespace std;

int main() {
    unordered_map<string, int> map;
    
    map["key1"] = 100;
    map["key2"] = 200;
    
    cout << map["key1"] << "\\n"; // 100
    cout << (map.count("key2") > 0) << "\\n"; // 1 (true)
    map.erase("key2");
    
    for (auto const& [key, val] : map) {
        cout << key << " " << val << "\\n";
    }
    return 0;
}`,
      c: `// C Manual Hash Map (Separate Chaining).
#include <stdio.h>
#include <stdlib.h>

typedef struct Node { int key, value; struct Node* next; } Node;
#define SIZE 10

Node* table[SIZE] = {NULL};

void put(int key, int value) {
    int idx = key % SIZE;
    Node* curr = table[idx];
    while(curr) {
        if(curr->key == key) { curr->value = value; return; }
        curr = curr->next;
    }
    Node* nn = malloc(sizeof(Node));
    nn->key = key; nn->value = value; nn->next = table[idx];
    table[idx] = nn;
}

int get(int key) {
    int idx = key % SIZE;
    Node* curr = table[idx];
    while(curr) {
        if(curr->key == key) return curr->value;
        curr = curr->next;
    }
    return -1;
}

int main() {
    put(1, 100);
    put(11, 200);
    printf("get(1): %d\\n", get(1));
    return 0;
}`
    }
  },
  {
    key: "stack",
    title: "Stack",
    snippets: {
      javascript: `// Stack using Array.
class Stack {
    constructor() { this.items = []; }
    push(val) { this.items.push(val); }
    pop() { return this.items.pop(); }
    peek() { return this.items[this.items.length - 1]; }
    isEmpty() { return this.items.length === 0; }
}`,
      python: `# Stack using List.
class Stack:
    def __init__(self):
        self.items = []
    def push(self, val):
        self.items.append(val)
    def pop(self):
        return self.items.pop() if not self.is_empty() else None
    def peek(self):
        return self.items[-1] if not self.is_empty() else None
    def is_empty(self):
        return len(self.items) == 0`,
      java: `// Stack using Array.
class Stack {
    int[] stack; int top = -1, capacity;
    Stack(int size) { capacity = size; stack = new int[size]; }
    void push(int x) { if(top < capacity - 1) stack[++top] = x; }
    int pop() { return top >= 0 ? stack[top--] : -1; }
    int peek() { return top >= 0 ? stack[top] : -1; }
    boolean isEmpty() { return top == -1; }
}`,
      cpp: `// Stack using std::vector or std::stack.
#include <stack>
using namespace std;

int main() {
    stack<int> s;
    s.push(1);
    s.push(2);
    int top_val = s.top(); // 2
    s.pop();
    bool empty = s.empty();
    return 0;
}`,
      c: `// Stack using array.
#include <stdio.h>
#define MAX 100

int stack[MAX];
int top = -1;

void push(int x) { if(top < MAX - 1) stack[++top] = x; }
int pop() { return top >= 0 ? stack[top--] : -1; }
int peek() { return top >= 0 ? stack[top] : -1; }
int isEmpty() { return top == -1; }`
    }
  },
  {
    key: "queue",
    title: "Queue",
    snippets: {
      javascript: `// Queue using Array (Shift is O(N)).
class Queue {
    constructor() { this.items = []; }
    enqueue(val) { this.items.push(val); }
    dequeue() { return this.items.shift(); }
    peek() { return this.items[0]; }
    isEmpty() { return this.items.length === 0; }
}`,
      python: `# Queue using collections.deque (O(1) popleft).
from collections import deque

class Queue:
    def __init__(self):
        self.q = deque()
    def enqueue(self, val):
        self.q.append(val)
    def dequeue(self):
        return self.q.popleft() if self.q else None
    def peek(self):
        return self.q[0] if self.q else None
    def is_empty(self):
        return len(self.q) == 0`,
      java: `// Queue using Array.
class Queue {
    int[] q; int front = 0, rear = 0, count = 0, cap;
    Queue(int size) { cap = size; q = new int[size]; }
    void enqueue(int x) { if(count < cap) { q[rear++] = x; count++; } }
    int dequeue() { if(count > 0) { count--; return q[front++]; } return -1; }
    int peek() { return count > 0 ? q[front] : -1; }
}`,
      cpp: `// Queue using std::queue.
#include <queue>
using namespace std;

int main() {
    queue<int> q;
    q.push(1);
    q.push(2);
    int front_val = q.front(); // 1
    q.pop();
    bool empty = q.empty();
    return 0;
}`,
      c: `// Queue using Array.
#include <stdio.h>
#define MAX 100

int q[MAX], front = 0, rear = 0;

void enqueue(int x) { if(rear < MAX) q[rear++] = x; }
int dequeue() { return front < rear ? q[front++] : -1; }
int peek() { return front < rear ? q[front] : -1; }`
    }
  },
  {
    key: "circular_queue",
    title: "Circular Queue",
    snippets: {
      javascript: `class CircularQueue {
    constructor(k) {
        this.q = new Array(k);
        this.head = -1; this.tail = -1;
        this.size = k;
    }
    enqueue(val) {
        if (this.isFull()) return false;
        if (this.isEmpty()) this.head = 0;
        this.tail = (this.tail + 1) % this.size;
        this.q[this.tail] = val;
        return true;
    }
    dequeue() {
        if (this.isEmpty()) return false;
        if (this.head === this.tail) { this.head = -1; this.tail = -1; }
        else this.head = (this.head + 1) % this.size;
        return true;
    }
    isFull() { return (this.tail + 1) % this.size === this.head; }
    isEmpty() { return this.head === -1; }
}`,
      python: `class CircularQueue:
    def __init__(self, k):
        self.q = [0]*k
        self.head = -1
        self.tail = -1
        self.size = k
        
    def enqueue(self, val):
        if self.is_full(): return False
        if self.is_empty(): self.head = 0
        self.tail = (self.tail + 1) % self.size
        self.q[self.tail] = val
        return True
        
    def dequeue(self):
        if self.is_empty(): return False
        if self.head == self.tail: self.head = self.tail = -1
        else: self.head = (self.head + 1) % self.size
        return True
        
    def is_full(self): return (self.tail + 1) % self.size == self.head
    def is_empty(self): return self.head == -1`,
      java: `class CircularQueue {
    int[] q; int front = -1, rear = -1, cap;
    CircularQueue(int size) { cap = size; q = new int[size]; }
    
    void enqueue(int x) {
        if (isFull()) return;
        if (isEmpty()) front = 0;
        rear = (rear + 1) % cap;
        q[rear] = x;
    }
    int dequeue() {
        if (isEmpty()) return -1;
        int val = q[front];
        if (front == rear) front = rear = -1;
        else front = (front + 1) % cap;
        return val;
    }
    boolean isFull() { return (rear + 1) % cap == front; }
    boolean isEmpty() { return front == -1; }
}`,
      cpp: `#include <vector>
using namespace std;

class CircularQueue {
    vector<int> q;
    int front = -1, rear = -1, cap;
public:
    CircularQueue(int k) { cap = k; q.resize(k); }
    bool enqueue(int val) {
        if (isFull()) return false;
        if (isEmpty()) front = 0;
        rear = (rear + 1) % cap;
        q[rear] = val;
        return true;
    }
    bool dequeue() {
        if (isEmpty()) return false;
        if (front == rear) front = rear = -1;
        else front = (front + 1) % cap;
        return true;
    }
    bool isEmpty() { return front == -1; }
    bool isFull() { return (rear + 1) % cap == front; }
};`,
      c: `#include <stdio.h>
#define MAX 100

int q[MAX], front = -1, rear = -1;

int isFull() { return (rear + 1) % MAX == front; }
int isEmpty() { return front == -1; }

void enqueue(int val) {
    if (isFull()) return;
    if (isEmpty()) front = 0;
    rear = (rear + 1) % MAX;
    q[rear] = val;
}
int dequeue() {
    if (isEmpty()) return -1;
    int val = q[front];
    if (front == rear) front = rear = -1;
    else front = (front + 1) % MAX;
    return val;
}`
    }
  },
  {
    key: "linked_list",
    title: "Singly Linked List",
    snippets: {
      javascript: `class Node {
    constructor(val) { this.val = val; this.next = null; }
}
class LinkedList {
    constructor() { this.head = null; }
    insert(val) {
        let node = new Node(val);
        node.next = this.head;
        this.head = node;
    }
}`,
      python: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None
    def insert(self, val):
        node = Node(val)
        node.next = self.head
        self.head = node`,
      java: `class Node {
    int data; Node next;
    Node(int d) { data = d; }
}
class LinkedList {
    Node head;
    void insert(int data) {
        Node node = new Node(data);
        node.next = head;
        head = node;
    }
}`,
      cpp: `#include <iostream>
using namespace std;

struct Node {
    int data; Node* next;
    Node(int d) : data(d), next(nullptr) {}
};

class LinkedList {
    Node* head = nullptr;
public:
    void insert(int data) {
        Node* node = new Node(data);
        node->next = head;
        head = node;
    }
};`,
      c: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data; struct Node* next;
} Node;

Node* head = NULL;

void insert(int data) {
    Node* node = malloc(sizeof(Node));
    node->data = data;
    node->next = head;
    head = node;
}`
    }
  },
  {
    key: "doubly_linked_list",
    title: "Doubly Linked List",
    snippets: {
      javascript: `class DNode {
    constructor(val) { this.val = val; this.next = null; this.prev = null; }
}
class DoublyLinkedList {
    constructor() { this.head = null; }
    insert(val) {
        let node = new DNode(val);
        if(this.head) { this.head.prev = node; node.next = this.head; }
        this.head = node;
    }
}`,
      python: `class DNode:
    def __init__(self, val):
        self.val = val
        self.next = None
        self.prev = None

class DoublyLinkedList:
    def __init__(self):
        self.head = None
    def insert(self, val):
        node = DNode(val)
        if self.head:
            self.head.prev = node
            node.next = self.head
        self.head = node`,
      java: `class DNode {
    int data; DNode next, prev;
    DNode(int d) { data = d; }
}
class DoublyLinkedList {
    DNode head;
    void insert(int data) {
        DNode node = new DNode(data);
        if(head != null) { head.prev = node; node.next = head; }
        head = node;
    }
}`,
      cpp: `struct DNode {
    int data; DNode* next; DNode* prev;
    DNode(int d) : data(d), next(nullptr), prev(nullptr) {}
};
class DoublyLinkedList {
    DNode* head = nullptr;
public:
    void insert(int data) {
        DNode* node = new DNode(data);
        if(head) { head->prev = node; node->next = head; }
        head = node;
    }
};`,
      c: `#include <stdlib.h>

typedef struct DNode {
    int data; struct DNode* next; struct DNode* prev;
} DNode;

DNode* head = NULL;

void insert(int data) {
    DNode* node = malloc(sizeof(DNode));
    node->data = data; node->prev = NULL; node->next = head;
    if(head) head->prev = node;
    head = node;
}`
    }
  },
  {
    key: "bst",
    title: "Binary Search Tree (BST)",
    snippets: {
      javascript: `class TreeNode {
    constructor(val) { this.val = val; this.left = this.right = null; }
}
class BST {
    constructor() { this.root = null; }
    insert(node, val) {
        if (!node) return new TreeNode(val);
        if (val < node.val) node.left = this.insert(node.left, val);
        else node.right = this.insert(node.right, val);
        return node;
    }
}`,
      python: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = self.right = None

class BST:
    def __init__(self):
        self.root = None
    def insert(self, node, val):
        if not node: return TreeNode(val)
        if val < node.val: node.left = self.insert(node.left, val)
        else: node.right = self.insert(node.right, val)
        return node`,
      java: `class TreeNode {
    int data; TreeNode left, right;
    TreeNode(int d) { data = d; }
}
class BST {
    TreeNode root;
    TreeNode insert(TreeNode node, int x) {
        if (node == null) return new TreeNode(x);
        if (x < node.data) node.left = insert(node.left, x);
        else if (x > node.data) node.right = insert(node.right, x);
        return node;
    }
}`,
      cpp: `struct TreeNode {
    int data; TreeNode *left, *right;
    TreeNode(int d) : data(d), left(nullptr), right(nullptr) {}
};
class BST {
public:
    TreeNode* root = nullptr;
    TreeNode* insert(TreeNode* node, int x) {
        if (!node) return new TreeNode(x);
        if (x < node->data) node->left = insert(node->left, x);
        else node->right = insert(node->right, x);
        return node;
    }
};`,
      c: `#include <stdlib.h>

typedef struct TreeNode {
    int data; struct TreeNode *left, *right;
} TreeNode;

TreeNode* insert(TreeNode* node, int x) {
    if (!node) {
        TreeNode* nn = malloc(sizeof(TreeNode));
        nn->data = x; nn->left = nn->right = NULL;
        return nn;
    }
    if (x < node->data) node->left = insert(node->left, x);
    else node->right = insert(node->right, x);
    return node;
}`
    }
  },
  {
    key: "min_heap",
    title: "Min Heap",
    snippets: {
      javascript: `class MinHeap {
    constructor() { this.heap = []; }
    insert(val) {
        this.heap.push(val);
        this.siftUp(this.heap.length - 1);
    }
    siftUp(i) {
        while (i > 0) {
            let p = Math.floor((i - 1) / 2);
            if (this.heap[p] > this.heap[i]) {
                [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
                i = p;
            } else break;
        }
    }
}`,
      python: `import heapq

# Python has built in min-heap via heapq
heap = []
heapq.heappush(heap, 10)
heapq.heappush(heap, 5)

min_val = heapq.heappop(heap) # 5`,
      java: `import java.util.PriorityQueue;

public class Main {
    public static void main(String[] args) {
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        minHeap.add(10);
        minHeap.add(5);
        
        int min = minHeap.poll(); // 5
    }
}`,
      cpp: `#include <queue>
#include <vector>
using namespace std;

int main() {
    priority_queue<int, vector<int>, greater<int>> minHeap;
    minHeap.push(10);
    minHeap.push(5);
    
    int min = minHeap.top(); // 5
    minHeap.pop();
    return 0;
}`,
      c: `// Manual Min Heap Implementation
#include <stdio.h>
#define MAX 100

int heap[MAX], size = 0;

void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

void insert(int val) {
    heap[size] = val;
    int i = size++;
    while (i > 0) {
        int p = (i - 1) / 2;
        if (heap[p] > heap[i]) { swap(&heap[p], &heap[i]); i = p; }
        else break;
    }
}`
    }
  },
  {
    key: "graph",
    title: "Graph (Adjacency List)",
    snippets: {
      javascript: `class Graph {
    constructor() { this.adj = new Map(); }
    addEdge(u, v) {
        if (!this.adj.has(u)) this.adj.set(u, []);
        if (!this.adj.has(v)) this.adj.set(v, []);
        this.adj.get(u).push(v);
        this.adj.get(v).push(u); // Remove for directed
    }
}`,
      python: `from collections import defaultdict

class Graph:
    def __init__(self):
        self.adj = defaultdict(list)
    def add_edge(self, u, v):
        self.adj[u].append(v)
        self.adj[v].append(u) # Remove for directed`,
      java: `import java.util.*;

class Graph {
    List<List<Integer>> adj;
    Graph(int v) {
        adj = new ArrayList<>();
        for (int i=0; i<v; i++) adj.add(new ArrayList<>());
    }
    void addEdge(int u, int v) {
        adj.get(u).add(v);
        adj.get(v).add(u);
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Graph {
    int V;
    vector<vector<int>> adj;
public:
    Graph(int v) { V = v; adj.resize(V); }
    void addEdge(int u, int v) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
};`,
      c: `#include <stdlib.h>

typedef struct Node { int dest; struct Node* next; } Node;
typedef struct AdjList { Node* head; } AdjList;

AdjList* graph;

void initGraph(int V) {
    graph = malloc(V * sizeof(AdjList));
    for (int i=0; i<V; i++) graph[i].head = NULL;
}
void addEdge(int u, int v) {
    Node* nn = malloc(sizeof(Node));
    nn->dest = v; nn->next = graph[u].head; graph[u].head = nn;
}`
    }
  },
  {
    key: "bubble_sort",
    title: "Bubble Sort",
    snippets: {
      javascript: `function bubbleSort(arr) {
    let n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        let swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return arr;
}`,
      python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr`,
      java: `public class Main {
    static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}`,
      c: `#include <stdbool.h>

void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(&arr[j], &arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}`
    }
  }
];
