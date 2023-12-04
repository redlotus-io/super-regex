import vm from "node:vm";

const script = new vm.Script("returnValue = functionToRun()");

export type FunctionTimeoutOptions = {
  /**
	The time in milliseconds to wait before timing out.

	Keep in mind that execution time can vary between different hardware and Node.js versions. Set a generous timeout to avoid flakiness.
	*/
  readonly timeout?: number;
  context?: any;
};

/**
Returns a wrapped version of the given function that throws a timeout error if the execution takes longer than the given timeout.

@example
```
import functionTimeout, {isTimeoutError} from 'function-timeout';

const generateNumbers = count => {
	// Imagine this takes a long time.
};

const generateNumbersWithTimeout = functionTimeout(generateNumbers, {timeout: 100});

try {
	console.log(generateNumbersWithTimeout(500));
} catch (error) {
	if (isTimeoutError(error)) {
		console.error('Timed out');
	} else {
		throw error;
	}
}
```
*/
export const functionTimeout = <T extends Function>(
  function_: T,
  { timeout, context = vm.createContext() }: FunctionTimeoutOptions = {},
) => {
  const wrappedFunction = (...arguments_: any) => {
    context.functionToRun = () => function_(...arguments_);
    script.runInNewContext(context, { timeout });
    return context.returnValue;
  };

  Object.defineProperty(wrappedFunction, "name", {
    value: `functionTimeout(${function_.name || "<anonymous>"})`,
    configurable: true,
  });

  return wrappedFunction;
};

/**
Returns a boolean for whether the given error is a timeout error.
*/
export const isTimeoutError = (error: any): boolean =>
  error?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT";
