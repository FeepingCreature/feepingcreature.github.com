A Whirlwind Introduction to Jerboa
# The Very Basics
Integers are a thing. `2`, `3`, `4`, `5`. Integers are 0 to 2^32 and wrap.

Floats! `2.0`, `3.0`, `4.`, etc. 32-bit IEEE floats, the regular.

Bools have two values, `true` and `false`.

The value `null` exists. It is the default value.

Comments are done as in C: `/*` and `*/` mark a multiline comment, `//` marks the rest of the line as a comment.

Math is done by infix operators. The operator precedence is:

| precedence | operator | meaning |
| --- | --- | ---  |
| 0 | \|\| | short-circuit or |
| 1 | && | short-circuit and |
| 2 | < > <= >= == != | comparisons
| 3 | + - | addition, subtraction |
| 4 | * / % | multiplication, division, modulo |
| 5 | \| | arithmetic or |
| 6 | & | arithmetic and |

Postfix works, prefix doesn't. TODO. Also `a += b` is the same exactly as `a = a + b`.

Precedence can be enforced with parens, ie. `(2 + 3) * 4`. Evaluation is left to right.

Functions are expressions. A function is called with `fun(param1, param2, param3)`.
This has higher precedence than any infix operation.

Strings are defined using quote marks: `"Hello World"` or `'Hello World'`.

## Statements

A Jerboa file consists of a list of statements.

Expressions are statements. When an expression is to be interpreted as a statement, it must be terminated by a semicolon.

A list of statements enclosed in brackets is a statement: `{ statement1; statement2; }`

Branching is done via the `if` statement, as in

    if (condition) statement;

Optionally, an `else` branch can be added.

    if (condition) statement; else statement;

While loops and for loops work as in C, analogously.

    while (condition) statement;
    for (var i = 0; i < 10; i++) {
    }

Loops may be marked using a label:

    label:while (condition) statement;

When marked as such, `break` and `continue` can specify the loop to be broken using `break label` and `continue label`.

## Truth

When evaluating a condition, we test a property called "truthiness" to disambiguate it from the boolean `true` and `false` values.

| type | truthiness |
| --- | --- |
| null | always false |
| bool | true if true, false if false |
| int | true if not zero |
| float | true if not zero |
| object | always true |

The "Boolean" operators in Jerboa are a bit unusual. They're short-circuiting, but operate on values, not bools.

`a || b` has the value of `a` if `a` is truthy, else `b`. If `a` is truthy, `b` is not evaluated.

`a && b` has the value of `b` if `a` is truthy, else `a`. If `a` is falsy, `b` is not evaluated.

Boolean logic falls out of this as a special case.

# Variables

Variables must be declared before they can be used. To declare a variable, simply write `var identifier;`.
The variable will start out with the value `null`. To initialize the variable, write `var identifier = value;`.
To assign a value to a variable later, write `identifier = value;`. You can declare multiple variables at once
by separating them with commas: `var a = 2, b = 3;`. Variables are scoped to the current block.

If you declare a variable with `const identifier` instead of `var identifier`, its immediate value cannot be changed.

Variable lookup proceeds lexically.

**Note**: Variable declarations are expressions. That means they can be used like this:

    if (var foo = someFunction()) { print(foo); }

# Objects

An object is something that contains a bunch of name-value pairs, called "properties", with each name being unique, as well as a "prototype" or "parent"
which is another object, which may have its own prototype and so on until you reach an object whose prototype is `null`.

An object is made using an "object literal":

    var object = {
      a = 5;
      b = 6;
    };

Note the use of "=" as opposed to ":" in Javascript.

The values of the properties can be accessed with `object.a`. If a property is not found, the object's prototype will
be searched, and then its prototype and so on. Accessing a missing property is an error. To check if a property can be
accessed, you can use `"a" in object`, which will be true if `object.a` succeeds. Accessing a property this way is called
"access as object".

To define a new object whose prototype is another object, use `new`:

    var child = new object {
      c = 5;
    }
    print(child.a); // still works and prints 5 because a is in prototype
    child.a = 8;

When you do not want to set any further properties, this works as a shortcut: `var child = new object;`.

**Important**: assigning a value to a property will always set it in the *actual object*, even
if the value exists in a prototype.

**Also important**: assigning a property that is not in the object yet at all, is an **error**. Defining new properties should
only be done by defining a new object with the old one as prototype. In case this cannot done, you can use the index operator.

An array is formed by using the an array literal:

    var array = [2, 25, 254, 2573];

Array values are accessed via the index operator: `array[2] == 254`, `array[3] = -7`. Indexes are 0-based. Accessing past the
end of the array is an error.

Properties can _also_ be accessed via the index operator: `object["a"]`. This syntax allows you to use properties that cannot
be identifiers. It works otherwise exactly the same as object access. The difference lies in assignment: while `object.a` will
error if the identifier is not yet in the prototype hierarchy, `object["a"] = 5;` will happily define `a` as a property of `object`.
This is called "access as array".

# Functions

Functions are expressions with the following syntax: `function(parameterlist) statement;`.

When assigned to a variable, like `var fn = function(a) { };`, the following equivalent syntax should be used:

    function fn(a) { }

The variable will be constant. A terminating semicolon is not required.

When `method` is used instead of `function` (as in, `method(a) { }`), the object that the method is called on is passed in
as an implicit parameter called `this`. That is, if the method is called like `object.method(5)`, then `this` is set to `object` inside
the method.

Code inside a function may access variables declared outside it, even if the surrounding function has already returned. These variables
will have the values that they had when their containing block ended.

# Type constraints

Variables and object properties can be "[proto]type constrained" using the following syntax:

    var a: int = 5
    var obj = {
      a: int = 6;
    };

When constrained, assigning a value with a different prototype to the variable will cause a runtime error.

# Other stuff

Since every value is an object, the infix math shown earlier are simply properties of the "int" prototype. That is, `2*3+4`
is the same as `2["*"](3)["+"](4)`.

Use `instanceof` to check if an object has another object as a prototype. To check types of values, simply use
`val instanceof int`, `float` or `bool`.

Most operations will error if their arguments are missing. To avoid if-heavy code,
use the "conditional access" operators: `a?.b`, which is null if `a` is null or `b` is not in it, `a?[b]` likewise, and `a?()`, which
is null if `a` is null and calls it otherwise.

Objects may be marked as "frozen" using `Object.freeze(object)`. In this state, values of keys in the object may no
longer be modified through any means.

Objects may be marked as "closed" using `Object.close(object)`. In this state,
no new keys may be added to the object.

These states are occasionally useful for optimization. For instance, accesses to a const frozen object
may be replaced with their values.

Fun trivia: Ints aren't _really_ objects internally, but they act like closed frozen empty objects for all intents and purposes.

# Source file management

To import other files, use the function `require(filename)`. `require(filename)` executes the given file,
using a search path of `/usr/share/jerboa`, `$HOME/.local/share/jerboa` (more specifically,
[following the XDG spec](https://standards.freedesktop.org/basedir-spec/basedir-spec-latest.html)),
and then the current directory; it then returns all variables defined in the toplevel as an object.
Multiple calls to `require` for the same file will result in the same object being returned.

**Note**: when importing libraries, such as `var gl = require('c/opengl.jb')`, it is strongly recommended to make the
module variable `const`, as in `const gl = require('c/opengl.jb')`. Doing so allows calls to imported functions
to be more effectively optimized.

# Standard Functions and Objects

* `int`: prototype of integer values, used for instanceof tests and constraints
  * `int.parse()` parse string as int
* `float`: prototype of floating point values
  * `float.toInt()` to cast to int
* `bool`: prototype of boolean values
* `function`: prototype of function expressions
  * `function.apply(this, array)`: call a function, with `array` used for arguments
  * `function.call(this, arg, arg, arg)`: call a function, with `arg` used for arguments
* `string`
  * prototype of strings
  * `string["+"]`: string concatenation is implemented with the addition operator
  * `string.startsWith(fragment)`: returns the rest of the string if it starts with `fragment`, null otherwise
  * `string.endsWith(fragment)`: returns the front of the string if it ends with `fragment`, null otherwise
  * `string.slice(from, to)`: return a substring from `from` to `to`, 0-based
  * `string.find(marker)`: return the offset into the string where `marker` was found, or `-1` otherwise
  * `string.replace(marker, replacement)`: replace `marker` with `replacement` in string
* `require(filename)`: execute `filename`, then return the defined variables as an object.
* `print(arg, arg, arg)`: print given values to stdout in an appropriate format. Useful for debugging.
* `assert(condition, message)`: aborts with `message` if `condition` is falsy.
* `Math`: maths functions
  * `Math.sin(x)`: sine function, domain of 0..2π
  * `Math.cos(x)`: cosine function, domain of 0..2π
  * `Math.tan(x)`: tangent function, domain of -π/2..π/2
  * `Math.log(x)`: natural logarithm
  * `Math.sqrt(x)`: square root
  * `Math.pow(base, exp)`: exponentiation function
  * `Math.max(arg, ...)`: the maximum of its arguments
  * `Math.min(arg, ...)`: the minimum of its arguments
* `Object`: **Not** the prototype of all objects; merely a collection of useful object-management functions
  * `Object.keys(obj)`: returns an array of all (string) keys in the object. Array keys are not returned.
  * `Object.freeze(obj)`: _freezes_ the object, preventing all future changes of defined values
  * `Object.close(obj)`: _closes_ the object, preventing all future definitions of new values
