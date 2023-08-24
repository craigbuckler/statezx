# stateZx

stateZ (state-easy) indeXedDB edition is a simple client-side state manager. Features:

* simple to use, e.g. `myState.x = 1; console.log( myState.x );`
* triggers events when a state changes
* synchronizes data across browser tabs and windows on the same domain
* vanilla JavaScript compatible with all frameworks
* also provides [PixDB](https://www.npmjs.com/package/pixdb) - a Promise-based indexedDB wrapper
* fast and lightweight - less than 4.5KB of code


## Compatibility

stateZx works in modern browsers which support ES modules.


## stateZ comparison

stateZx works in a different way to [stateZ](https://github.com/craigbuckler/statez):

| feature | stateZ | stateZx |
|-|-|-|
| code size| 2Kb | 4.5Kb |
| storage | session/localStorage | indexedDB |
| storage limit | typically 5MB | typically 1GB |
| data types | stringified values | values, objects, blobs |
| data lifetime | permanent, session, page | permanent |
| initial values | whole database or whole object only | individual properties |
| event triggering | change to store | change to store or an individual property |
| syncing | manual or on page unload | automatic, real-time |
| performance | good, but synchronous storage | good with asynchronous storage |

In general, [stateZ](https://github.com/craigbuckler/statez) is a reasonable option for web sites with minimal storage requirements. stateZx may be preferable for more complex web apps.


## Installation

Load the module from a CDN:

```js
import { statezx } from 'https://cdn.jsdelivr.net/npm/statezx/dist/statezx.js'
```

If using `npm` and a bundler, install with:

```sh
npm install statezx
```

then import the module locally *(path resolution will depend on the bundler)*:

```js
import { stateZx } from './node_modules/statezx/dist/statezx.js';
```

Note that [PixDB](https://github.com/craigbuckler/pixdb) - a Promise-based indexedDB wrapper - is also available should you require it:

```js
import { stateZx, PixDB } from ...
```


## Examples

Create/access a named state store by passing an optional name and initialization object:

```js
const state = await stateZx('myState', { a: 1, b: 2, c: 3 });
```

This returns a Promise so `await` is used. Any state object on any page which accesses the same `myState` store has access to the same properties. Values from the database initialize the properties. If `a` does not exist, it uses the value from the initialization object, e.g. `state.a` would be set to `1`.

Set and retrieve values:

```js
// set state
state.x = 123;
state.y = 'abc';

// get state
console.log( state.x, state.y ); // 123 abc

// output all properties
for (let p in state) {
  console.log(`${ p }: ${ state[p] }`);
}

// delete state
delete state.x; // or
state.x = undefined;
```

Get the store name:

```js
console.log( state.stateId ); // myState
```

Run an event handler when any property changes:

```js
// event handler function
function stateEventHandler(evt) {

  const d = evt.detail;
  console.log(`
    ${ d.property } has changed
    from ${ d.valueOld } to ${ d.value }
    in store ${ d.store.stateId }
    (event type "${ evt.type }")
  `);

}

// handle any state change
state.addEventListener('*', stateEventHandler);
```

or when an individual property changes:

```js
// handle changes to state.a property
state.addEventListener('a', stateEventHandler);
```

Example:

```js
state.a = 'one';

/*
both the "a" and "any change" events trigger - ouput:
a has changed from 1 to one in store myStore (event type "a")
a has changed from 1 to one in store myStore (event type "*")
*/

state.b = 'two';

/*
the "any change" event triggers - ouput:
b has changed from 2 to two in store myStore (event type "*")
*/
```


## API reference

Access a named store using the asynchronous `stateZx` constructor with optional parameters:

| name | type | description |
|-|-|-|
| `stateId` | string | state identifier (`statezx` if not defined) |
| `stateDefault` | object | initialization object |

The initialization object can contain any number of key/value pairs, e.g.

```js
const state = await stateZx('myState', {
  a: 1,
  b: 'two',
  c: false,
  xArray: [1,2,3],
  yObject: { p1: 'prop1', p2: 'prop2' }
});
```

stateZx uses previously-stored database values by default. Therefore, `state.a` is only set to `1` if it wasn't stored (or it's `1` in the store). Setting a new value stores it in the indexedDB database, triggers events, and synchronizes with other tabs/windows (which trigger their own events).


### .stateId

Returns the state identifier (read-only):

```js
console.log( state.stateId ); // myState
```


### set, get, and delete properties

Set and get any property using a valid name and value:

```js
state.prop1 = 'my first property';

console.log( state.prop1 );     // my first property
console.log( state['prop1'] );  // my first property
```

Delete a property:

```js
delete state.prop1;
// or: delete state['prop1'];
// or: state.prop1 = undefined;
// or: state['prop1'] = undefined;
console.log( state.prop1 );     // undefined
```

Delete all properties:

```js
for (let p in state) delete state[p];
```

Property:

* *names* can contain letters in any case, numbers, or hyphens - but must start with a letter
* *values* can be any native value, array, or object - but not a function

Values are checked to ensure they've changed before triggering storage, events, and tab/window synchronization. Setting `state.a = 1` only has an effect if it's not already `1`.


### Setting properties as objects or arrays

Setting a property to an object or array will **always** trigger storage, events, and tab/window synchronization. This occurs because objects are passed by reference. Two instances are not the same even when their values are identical:

```js
console.log( state.myArray );   // [1,2,3]
state.myArray = [1,2,3];        // triggers store, event, sync

console.log( state.myObject );  // {a:1,b:2}
state.myObject = {a:1,b:2};     // triggers store, event, sync
```

Setting a child property or array element will **not** trigger storage, events, and synchronization:

```js
state.myArray.push[4];  // not handled
state.myObject.a = 99;  // not handled
state.myObject.c = 100; // not handled
```

It may be preferable to update the whole object or create separate stateZx stores with native values rather than use nested arrays and objects.


### .set(property, value)

Sets temporary session-like values in the current tab. It does not trigger storage, events, and synchronization:

```js
// set value
state.set('temp', 'temporary value');
console.log(state.temp); // temporary value

// delete value
state.set('temp');
console.log(state.temp); // undefined
```


### State change events

You can trigger event handler functions when **any** property changes:

```js
// handle any state change
state.addEventListener('*', stateEventHandler);
```

or when an individual property changes:

```js
// handle changes to state.myProp property
state.addEventListener('myProp', stateEventHandler);
```

Changes to `state.myProp` triggers both event handlers (the more specific `'myProp'` handler runs first).

The handler function receives a single object containing information about the event. Its `.detail` property defines an object with the following properties:

| property | description |
|-|-|
| `.property` | name of the updated property |
| `.value` | the new value |
| `.valueOld` | the old value |
| `.state` | the state object |

Example:

```js
// event handler function
function stateEventHandler(evt) {

  const d = evt.detail;
  console.log(`stateId       : ${ d.store.stateId }`);
  console.log(`property name : ${ d.property }`);
  console.log(`new value     : ${ d.value }`);
  console.log(`previous value: ${ d.valueOld }`);

}
```

A state change will also trigger on other tabs and windows using stateZx on the same domain during synchronization.

Remove event handlers with the `.removeEventListener()` method:

```js
state.removeEventListener('*', stateEventHandler);
state.removeEventListener('myProp', stateEventHandler);
```


### Event and synchronization lifecycle

You can synchronously change and examine any stateZx object's properties in real time. There are no asynchronous operations other than the initial constructor.

stateZx records all property changes. A process runs on a later iteration of the JavaScript event loop to make background updates. It executes no more than 60 times per second, although it's unlikely to occur that often. Consider the following code:

```js
let counter = state.counter;

for (let i = 0; i < 1000; i++) {
  counter++;
  state.counter = counter;
}
```

The code will **not** trigger 1,000 storage, event, and synchronization processes. If `state.counter` is initially stored as `0`, the synchronous loop will complete and it's value will become `1000`. The update process runs at some future point which:

1. triggers local events where the `details` object has `.property` set to `'counter'`, `.oldValue` set to `0`, and `.value` set to `1000`

1. updates `counter` in the indexedDB store which changes the value from `0` to `1000`

1. broadcasts a synchronization event to all tabs/windows on the same domain using stateZx which triggers an identical event.

Intensive state changes do not have a significant impact on performance because stateZx only updates changed properties when the program is idle. Nothing would run if `state.counter = 0;` was added after the loop!


## Usage policy

You are free to use this as you like but please do not republish it as your own work.

Please consider [sponsorship](https://github.com/sponsors/craigbuckler) if you use **stateZx** commercially, require support, or want new features.
