/**
 * Name path utilities for parsing and matching hierarchical symbol paths.
 *
 * Name path format:
 * - "/ClassName/methodName" - Absolute path (must match from root)
 * - "ClassName/methodName" - Relative path (matches any suffix)
 * - "methodName" - Simple name (matches any symbol with that name)
 * - "Class/get*" - With glob pattern (substring matching on last element)
 *
 * Uses "/" as separator to match Serena's convention.
 */

/**
 * Parsed name path pattern for matching.
 */
export interface ParsedNamePath {
  /** Whether the path is absolute (starts with /) */
  isAbsolute: boolean;
  /** Path segments */
  segments: string[];
  /** Whether to use substring matching on last segment */
  substringMatch: boolean;
  /** Optional overload index (e.g., [0], [1]) */
  overloadIndex?: number;
}

/**
 * Parse a name path pattern into its components.
 *
 * @param pattern - The name path pattern to parse
 * @returns Parsed pattern components
 *
 * @example
 * parseNamePath("/MyClass/myMethod") // absolute path
 * parseNamePath("MyClass/myMethod")  // relative path
 * parseNamePath("myMethod")          // simple name
 * parseNamePath("MyClass/get*")      // with glob
 * parseNamePath("MyClass/method[0]") // with overload index
 */
export function parseNamePath(pattern: string): ParsedNamePath {
  let isAbsolute = false;
  let workingPattern = pattern.trim();

  // Check for absolute path
  if (workingPattern.startsWith('/')) {
    isAbsolute = true;
    workingPattern = workingPattern.slice(1);
  }

  // Check for overload index at the end (e.g., "[0]", "[1]")
  let overloadIndex: number | undefined;
  const overloadMatch = workingPattern.match(/\[(\d+)\]$/);
  if (overloadMatch) {
    overloadIndex = parseInt(overloadMatch[1], 10);
    workingPattern = workingPattern.slice(0, -overloadMatch[0].length);
  }

  // Split into segments
  const segments = workingPattern.split('/').filter((s) => s.length > 0);

  // Check if last segment has glob pattern (ends with *)
  const substringMatch = segments.length > 0 && segments[segments.length - 1].endsWith('*');

  // Remove the * from last segment if present
  if (substringMatch && segments.length > 0) {
    segments[segments.length - 1] = segments[segments.length - 1].slice(0, -1);
  }

  return {
    isAbsolute,
    segments,
    substringMatch,
    overloadIndex,
  };
}

/**
 * Build a name path from parent path and name.
 *
 * @param parentPath - Parent symbol's name path (or undefined for top-level)
 * @param name - Symbol's name
 * @returns Complete name path
 *
 * @example
 * buildNamePath(undefined, "MyClass")     // "/MyClass"
 * buildNamePath("/MyClass", "myMethod")   // "/MyClass/myMethod"
 */
export function buildNamePath(parentPath: string | undefined, name: string): string {
  if (!parentPath) {
    return `/${name}`;
  }
  return `${parentPath}/${name}`;
}

/**
 * Check if a name path matches a pattern.
 *
 * @param namePath - The full name path of a symbol (e.g., "/MyClass/myMethod")
 * @param pattern - The parsed pattern to match against
 * @param useSubstringMatching - Override substring matching for last segment
 * @returns True if the name path matches the pattern
 *
 * @example
 * // Absolute match
 * matchNamePath("/MyClass/myMethod", parseNamePath("/MyClass/myMethod")) // true
 * matchNamePath("/MyClass/myMethod", parseNamePath("/OtherClass/myMethod")) // false
 *
 * // Relative match (suffix)
 * matchNamePath("/MyClass/myMethod", parseNamePath("myMethod")) // true
 * matchNamePath("/MyClass/myMethod", parseNamePath("MyClass/myMethod")) // true
 *
 * // Substring match
 * matchNamePath("/MyClass/getValue", parseNamePath("get*")) // true
 */
export function matchNamePath(
  namePath: string,
  pattern: ParsedNamePath,
  useSubstringMatching?: boolean
): boolean {
  // Normalize the name path (ensure it starts with /)
  const normalizedPath = namePath.startsWith('/') ? namePath : `/${namePath}`;
  const pathSegments = normalizedPath.split('/').filter((s) => s.length > 0);

  const { isAbsolute, segments: patternSegments, substringMatch } = pattern;
  const shouldSubstring = useSubstringMatching ?? substringMatch;

  if (patternSegments.length === 0) {
    return true; // Empty pattern matches everything
  }

  if (isAbsolute) {
    // Absolute path must match from the start
    if (pathSegments.length !== patternSegments.length) {
      return false;
    }

    for (let i = 0; i < patternSegments.length; i++) {
      const isLastSegment = i === patternSegments.length - 1;
      if (!segmentMatches(pathSegments[i], patternSegments[i], isLastSegment && shouldSubstring)) {
        return false;
      }
    }
    return true;
  } else {
    // Relative path - find suffix match
    if (pathSegments.length < patternSegments.length) {
      return false;
    }

    // Try to match from the end
    const startIdx = pathSegments.length - patternSegments.length;
    for (let i = 0; i < patternSegments.length; i++) {
      const isLastSegment = i === patternSegments.length - 1;
      if (
        !segmentMatches(
          pathSegments[startIdx + i],
          patternSegments[i],
          isLastSegment && shouldSubstring
        )
      ) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Check if a path segment matches a pattern segment.
 */
function segmentMatches(
  pathSegment: string,
  patternSegment: string,
  useSubstring: boolean
): boolean {
  if (useSubstring) {
    return pathSegment.toLowerCase().startsWith(patternSegment.toLowerCase());
  }
  return pathSegment === patternSegment;
}

/**
 * Extract the last segment (symbol name) from a name path.
 *
 * @param namePath - Full name path
 * @returns The last segment (symbol name)
 *
 * @example
 * getSymbolName("/MyClass/myMethod") // "myMethod"
 * getSymbolName("/topLevelFunc")     // "topLevelFunc"
 */
export function getSymbolName(namePath: string): string {
  const segments = namePath.split('/').filter((s) => s.length > 0);
  return segments[segments.length - 1] || '';
}

/**
 * Get the parent path from a name path.
 *
 * @param namePath - Full name path
 * @returns Parent path, or undefined if top-level
 *
 * @example
 * getParentPath("/MyClass/myMethod") // "/MyClass"
 * getParentPath("/topLevelFunc")     // undefined
 */
export function getParentPath(namePath: string): string | undefined {
  const segments = namePath.split('/').filter((s) => s.length > 0);
  if (segments.length <= 1) {
    return undefined;
  }
  return '/' + segments.slice(0, -1).join('/');
}

/**
 * Get the depth of a name path (number of segments - 1).
 *
 * @param namePath - Full name path
 * @returns Depth (0 for top-level)
 *
 * @example
 * getNamePathDepth("/topLevel")           // 0
 * getNamePathDepth("/MyClass/myMethod")   // 1
 */
export function getNamePathDepth(namePath: string): number {
  const segments = namePath.split('/').filter((s) => s.length > 0);
  return Math.max(0, segments.length - 1);
}

/**
 * Create a display-friendly version of a name path.
 * Removes the leading slash for cleaner display.
 *
 * @param namePath - Full name path
 * @returns Display string
 */
export function formatNamePath(namePath: string): string {
  return namePath.startsWith('/') ? namePath.slice(1) : namePath;
}
