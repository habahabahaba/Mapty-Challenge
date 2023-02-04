'use strict';

const a = 'fff1';
const b = 'fff1';
console.log(a > b);

const obj = {};
const arr = ['a', 'c', 'b', 'd', 'e'];
const arr1 = [obj[a], 'a', obj[a], obj[a], 'c', 'b', obj[a], 'd', 'e'];

console.log(arr);
// console.log(arr.sort((l, m) => (l < m ? -1 : 1)));

// console.log('aaaa1' === 'aaaa1');

function cToEnd(arr) {
  for (const e of arr) {
    if (typeof e === 'undefined') {
      arr.push(arr.splice(arr.indexOf(e), 1)[0]);
    } else {
      continue;
    }
  }
  return arr;
}

console.log(cToEnd(arr1));
