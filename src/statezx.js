// indexedDB manager
import { PixDB } from '../node_modules/pixdb/dist/pixdb.js';

const
  stateCache = new Map(),                     // state object cache
  syncQ = new Map(),                          // state synchroization queue
  store = 'statezx',                          // objectStore
  index = 'stateIdx',                         // objectStore index
  broadcast = new BroadcastChannel( store );  // broadcast to other windows/tabs

let
  sync,                                       // synchronization event
  db, dbTry = 3;                              // PixDB object


// simple requestIdleCallback polyfill
const idleCallback = window.requestIdleCallback || (cb => setTimeout(cb, 20));


// state storage class
class State extends EventTarget {

  // state name
  #stateId = null;

  constructor(stateId) {
    super();
    this.#stateId = stateId;
  }

  get stateId() {
    return this.#stateId;
  }

  // set session property (no event, storage, or broadcast)
  set(property, value) {
    if (typeof value === 'undefined') {
      return Reflect.deleteProperty(this, property);
    }
    else {
      return Reflect.set(this, property, value);
    }
  }

  // add event listener
  addEventListener() {
    super.addEventListener.apply(this, arguments);
  }


  // add event listener
  removeEventListener() {
    super.removeEventListener.apply(this, arguments);
  }

  // dispatch event
  dispatchEvent(detail) {
    const data = { detail, bubbles: false, cancelable: false };
    super.dispatchEvent( new CustomEvent(detail.property, data) );
    super.dispatchEvent( new CustomEvent('*', data) );
  }

}


// state proxy handler
const stateHandler = {

  // set property
  set: (state, property, value) => setState(state, property, value),

  // delete property
  deleteProperty: (state, property) => setState(state, property),

  // get property
  get: (state, property) => {

    const method = state[property];
    if (typeof method === 'function') {

      // method call
      return function(...args) {
        return method.apply(state, args);
      };

    }
    else {

      // property get
      return Reflect.get(state, property);

    }

  }

};


// stateZx factory
async function stateZx(stateId, stateDefault) {

  stateId = stateId || store;

  // cached/new store
  if (!stateCache.has(stateId)) {

    stateCache.set(stateId, new Proxy(
      new State(stateId),
      stateHandler
    ));

  }

  // initialize
  const state = stateCache.get( stateId );

  await dbInit();
  await stateInit(state, {...stateDefault});

  return state;

}


// initialize database
async function dbInit() {

  if (db || !dbTry) return;

  dbTry--;
  db = await new PixDB(`${ store }DB` , 1, (init, oldV) => {

    switch (oldV) {

      case 0: {
        const statezx = init.createObjectStore(store, { keyPath: 'id' });
        statezx.createIndex(index, 'state', { unique: false });
      }

    }

  });

}


// populate initial properties
async function stateInit(state, stateDefault) {

  if (!db) return;

  // from DB values
  const rec = await db.getAll({ store, index, lowerBound: state.stateId, upperBound: state.stateId });

  rec.forEach(p => {
    const prop = p.property;
    state.set(prop, p.value);
    delete stateDefault[ prop ];
  });

  // from defaults
  for (let p in stateDefault) {
    state[ p ] = stateDefault[p];
  }

}


// update state
function setState(state, property, value) {

  const valueOld = Reflect.get(state, property);
  let ret = true;

  // no change
  if (valueOld === value) return ret;

  // changed
  if (typeof value === 'undefined') {
    ret = Reflect.deleteProperty(state, property);
  }
  else {
    ret = Reflect.set(state, property, value);
  }

  if (ret) {

    // synchronize state
    const
      id = state.stateId + '.' + property,
      data = syncQ.get(id) || { state, property, valueOld };

    data.value = value;
    syncQ.set( id, data );
    sync = sync || idleCallback(syncState);

  }

  return ret;

}


// synchronize state
async function syncState() {

  const sIter = syncQ.values();
  let detail;

  do {

    detail = sIter.next().value;
    if (!detail || detail.value === detail.valueOld) continue;

    const { state, property, value } = detail;

    // trigger events
    state.dispatchEvent(detail);

    if (!db) continue;

    // store in DB
    const
      sName = state.stateId,
      id = sName + '.' + property;

    if (typeof value === 'undefined') {

      // delete item
      console.log(`DB DEL: ${ id }`);
      await db.delete({ store, key: id  });

    }
    else {

      // update item
      console.log(`DB PUT: ${ id } = ${ JSON.stringify(value) }`);
      await db.put({ store, item: {
        id,
        state: sName,
        property: property,
        value
      }});

    }

    // broadcast update
    broadcast.postMessage({ state: sName, property, value });

  } while (detail);

  syncQ.clear();
  sync = null;

}


// broadcast handler
broadcast.onmessage = msg => {

  const
    { state, property, value } = msg.data,
    s = stateCache.get( state );

  console.log(`B/CAST: ${ state }.${ property } = ${ JSON.stringify(value) }`);

  if (s) {
    const detail = { state: s, property, value, valueOld: s[property] };
    s.set(property, value);
    s.dispatchEvent(detail);
  }

};

export { stateZx, PixDB };
