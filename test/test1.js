// PixDB testing
import { stateZx, PixDB } from '../dist/statezx.js';


// ############# start tests #############

const statezx = window.statezx = await stateZx();
const myState1 = window.myState1 = await stateZx('myState1', { a: 'one', b: 'two', c: 'three' });
const myState1a = window.myState1a = await stateZx('myState1', { d: 4, e: 5, f: 6 });

myState1.a = 1;
myState1.b = 2;

// direct database connection
const db = await new PixDB('statezxDB', 1);

log('myState.stateId  :', statezx.stateId);
log('myState1.stateId :', myState1.stateId);
log('myState1a.stateId:', myState1a.stateId);

console.assert(statezx.stateId === 'statezx', `myState incorrect stateId: ${ statezx.stateId }`);
console.assert(myState1.stateId === 'myState1', `myState1 incorrect stateId: ${ myState1.stateId }`);
console.assert(myState1a.stateId === 'myState1', `myState1a incorrect stateId: ${ myState1a.stateId }`);


// ----------------
// session value
console.assert(typeof statezx.session === 'undefined', `myState.session is set to ${ statezx.session }`);

const ssVal = 'session value';
statezx.set('session', ssVal);

console.assert(statezx.session === ssVal, `myState.session is "${ statezx.session }" and not "${ ssVal }"`);

statezx.set('session');
console.assert(typeof statezx.session === 'undefined', `myState.session is "${ statezx.session }" and not "undefined"`);


// ----------------
// set event handlers
const
  mevent = eventDetails('myState  '),
  m1event = eventDetails('myState1 '),
  m1aevent = eventDetails('myState1a');

statezx.addEventListener('*', mevent);
myState1.addEventListener('*', m1event);
myState1a.addEventListener('a', m1aevent);

document.getElementById('showstate').addEventListener('click', () => { showStates(); checkDatabase(); });


// ----------------
// update values, check events

showStates();

await time(2000);

statezx.addEventListener('*', checkEvent);
myState1.addEventListener('*', checkEvent);

const update = {

  statezx: [
    { x: [99,99,99] },
    { y: { v: 100 } },
    { z: true },
  ],

  myState1: [
    { a: Math.round(Math.random() * 10) },
    { b: Math.round(Math.random() * 10) },
    { c: undefined },
  ]

};

for (const state in update) {
  update[state].forEach(obj => {
    for (const o in obj) {
      window[state][o] = obj[o];
    }
  });
}

await time(1000);


// ----------------
// deletion keyword

statezx.removeEventListener('*', checkEvent);
myState1.removeEventListener('*', checkEvent);

myState1.e = undefined;
delete myState1a.f;

await time(1000);

showStates();
checkDatabase();


// ############# end of tests #############

// wait
function time(w) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), Math.max(1, w || 1));
  });
}

// show states
function showStates() {
  log('\ncurrent state');
  log('STATE statezx  :', statezx);
  log('STATE myState1 :', myState1);
  log('STATE myState1a:', myState1a);
  log();
}


// check database
async function checkDatabase() {

  const
    rec = await db.getAll({ store: 'statezx' }),
    prop = {};

  let valid = true;

  rec.forEach(r => {

    // list of properties
    prop[r.state] = prop[r.state] || [];
    prop[r.state].push(r.property);

    // check local and DB values
    const
      val = JSON.stringify( window[r.state][r.property] ),
      dbVal = JSON.stringify( r.value );

    valid &= (val === dbVal);
    console.assert(val === dbVal, `${ r.state }.${ r.property } is "${ val }" - the DB holds: "${ dbVal }"`);
  });

  for (const s in prop) {

    for (const p in window[s]) {
      valid &= prop[s].includes(p);
      console.assert(prop[s].includes(p), `${ s }.${ p } is "${ window[s][p] }" - but not in the DB`);
    }

  }

  log(`Database is ${ valid ? 'valid': 'INVALID' }`);

  return valid;

}


// show event details
function eventDetails(name) {

  return function(evt) {
    const d = evt.detail;
    log(`EVENT ${ name }.${ evt.type }: ${ d.property } = ${ JSON.stringify(d.value) } (was ${ JSON.stringify(d.valueOld) })`);
  };

}


// check event order
function checkEvent(evt) {

  const
    d = evt.detail,
    uId = d.state.stateId,
    item = update[ uId ].shift(),
    eValue = JSON.stringify( d.value ),
    uValue = JSON.stringify( item[ d.property ] );

  console.assert(eValue === uValue, `EVENT ${ uId }.${ d.property } = "${ eValue }" - expected: "${ uValue }"`);

}


// log to page
function log() {

  const msg = Array.from(arguments).map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  window.outputlog = window.outputlog || document.getElementById('outputlog');
  window.outputlog.textContent += msg +'\n';

}
