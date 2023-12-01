/* eslint-disable consistent-return */
import functionTimeout, { isTimeoutError } from "function-timeout";
import { type Options } from "function-timeout";
import timeSpan from "time-span";

export type Match = {
  match: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
  input: string;
};

export type MatchesOptions = {
  /**
	The time in milliseconds to wait before timing out when searching for each match.
	*/
  readonly matchTimeout?: number;
} & Options;

const resultToMatch = (result: any) => ({
  match: result[0],
  index: result.index,
  groups: result.slice(1),
  namedGroups: result.groups ?? {},
  input: result.input,
});

/**
Returns a boolean for whether the given `regex` matches the given `string`.

If the regex takes longer to match than the given timeout, it returns `false`.

_This method is similar to [`RegExp#test`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test), but differs in that the given `regex` is [never mutated, even when it has the `/g` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test#using_test_on_a_regex_with_the_global_flag)._

@example
```
import {isMatch} from 'super-regex';

console.log(isMatch(/\d+/, getUserInput(), {timeout: 1000}));
```
*/
export const isMatch = (regex: RegExp, string: string, { timeout }: Options = {}): boolean => {
  try {
    return functionTimeout(() => structuredClone(regex).test(string), { timeout })();
  } catch (error) {
    if (isTimeoutError(error)) {
      return false;
    }

    throw error;
  }
};

/**
Returns the first match or `undefined` if there was no match.

If the regex takes longer to match than the given timeout, it returns `undefined`.

@example
```
import {firstMatch} from 'super-regex';

console.log(firstMatch(/\d+/, getUserInput(), {timeout: 1000}));
```
*/
export function firstMatch(
  regex: RegExp,
  string: string,
  { timeout }: Options = {},
): Match | undefined {
  try {
    const result = functionTimeout(() => structuredClone(regex).exec(string), {
      timeout,
    })();

    if (result === null) {
      return;
    }

    return resultToMatch(result);
  } catch (error) {
    if (isTimeoutError(error)) {
      return;
    }

    throw error;
  }
}

/**
Returns an iterable of matches.

If the regex takes longer to match than the given timeout, it returns an empty array.

__The `regex` must have the `/g` flag.__

@example
```
import {matches} from 'super-regex';

console.log([...matches(/\d+/, getUserInput(), {timeout: 1000})]);
```
*/
export function matches(
  regex: RegExp,
  string: string,
  {
    timeout = Number.POSITIVE_INFINITY,
    matchTimeout = Number.POSITIVE_INFINITY,
  }: MatchesOptions = {},
): Iterable<Match> {
  if (!regex.global) {
    throw new Error("The regex must have the global flag, otherwise, use `firstMatch()` instead");
  }

  return {
    *[Symbol.iterator]() {
      try {
        const matches2 = string.matchAll(regex); // The regex is only executed when iterated over.

        while (true) {
          // `matches.next` must be called within an arrow function so that it doesn't loose its context.
          const nextMatch = functionTimeout(() => matches2.next(), {
            timeout:
              timeout !== Number.POSITIVE_INFINITY || matchTimeout !== Number.POSITIVE_INFINITY
                ? Math.min(timeout, matchTimeout)
                : undefined,
          });

          const end = timeSpan();
          const { value, done } = nextMatch();
          timeout -= Math.ceil(end());

          if (done) {
            break;
          }

          yield resultToMatch(value);
        }
      } catch (error) {
        if (!isTimeoutError(error)) {
          throw error;
        }
      }
    },
  };
}
