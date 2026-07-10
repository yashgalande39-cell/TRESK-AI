const vm = require('vm');

const parseInputToArguments = (inputStr) => {
  try {
    const sandbox = { Math, Array, Object, String, Number, Boolean, Date, RegExp, Map, Set, JSON };
    const context = vm.createContext(sandbox);
    const result = vm.runInContext(`[${inputStr}]`, context);
    if (Array.isArray(result)) {
      return result;
    }
  } catch (e) {
    // Fail safe
  }
  return [inputStr];
};

console.log('Testing "abcabcbb":', parseInputToArguments('abcabcbb'));
console.log('Testing "[2,7,11,15], 9":', parseInputToArguments('[2,7,11,15], 9'));
console.log('Testing "()":', parseInputToArguments('()'));
console.log('Testing "()[]{}\\r":', parseInputToArguments('()[]{}\r'));
