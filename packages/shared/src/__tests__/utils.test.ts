import {
  formatPrice,
  calculateDiscount,
  formatPhoneNumber,
  isValidPhoneNumber,
  isValidEmail,
  isValidPinCode,
  generateId,
  formatDate,
  timeAgo,
  truncateText,
  calculateOrderTotal,
  canTransitionOrderStatus,
  slugify,
  calculateAverageRating,
  getInitials,
  deepClone,
  debounce,
  groupBy,
  isBusinessOpen,
  sanitizeSearchQuery,
} from '../utils';
import { OrderStatus } from '../types';

describe('formatPrice', () => {
  it('formats amount with default currency symbol', () => {
    expect(formatPrice(100)).toBe('₹100.00');
    expect(formatPrice(99.9)).toBe('₹99.90');
    expect(formatPrice(0)).toBe('₹0.00');
  });

  it('formats amount with custom currency', () => {
    expect(formatPrice(50, '$')).toBe('$50.00');
    expect(formatPrice(10.5, '€')).toBe('€10.50');
  });

  it('handles decimal precision', () => {
    expect(formatPrice(19.999)).toBe('₹20.00');
    expect(formatPrice(0.1 + 0.2)).toBe('₹0.30');
  });
});

describe('calculateDiscount', () => {
  it('calculates discount percentage correctly', () => {
    expect(calculateDiscount(100, 80)).toBe(20);
    expect(calculateDiscount(200, 150)).toBe(25);
    expect(calculateDiscount(500, 250)).toBe(50);
  });

  it('returns 0 for zero or negative original price', () => {
    expect(calculateDiscount(0, 50)).toBe(0);
    expect(calculateDiscount(-10, 5)).toBe(0);
  });

  it('rounds the result', () => {
    expect(calculateDiscount(3, 1)).toBe(67);
    expect(calculateDiscount(7, 2)).toBe(71);
  });

  it('handles same price (no discount)', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });
});

describe('formatPhoneNumber', () => {
  it('formats 10-digit Indian phone number', () => {
    expect(formatPhoneNumber('9876543210')).toBe('+91 98765 43210');
    expect(formatPhoneNumber('6123456789')).toBe('+91 61234 56789');
  });

  it('returns original if not 10 digits', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
    expect(formatPhoneNumber('+919876543210')).toBe('+919876543210');
  });

  it('strips non-digit characters before formatting', () => {
    expect(formatPhoneNumber('987-654-3210')).toBe('+91 98765 43210');
    expect(formatPhoneNumber('(987) 654 3210')).toBe('+91 98765 43210');
  });
});

describe('isValidPhoneNumber', () => {
  it('validates correct Indian phone numbers', () => {
    expect(isValidPhoneNumber('9876543210')).toBe(true);
    expect(isValidPhoneNumber('6123456789')).toBe(true);
    expect(isValidPhoneNumber('7000000000')).toBe(true);
    expect(isValidPhoneNumber('8999999999')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(isValidPhoneNumber('5876543210')).toBe(false);
    expect(isValidPhoneNumber('1234567890')).toBe(false);
    expect(isValidPhoneNumber('98765')).toBe(false);
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber('98765432101')).toBe(false);
  });

  it('strips non-digit chars before validation', () => {
    expect(isValidPhoneNumber('987-654-3210')).toBe(true);
    expect(isValidPhoneNumber('+91 98765 43210')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('validates correct emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co.in')).toBe(true);
    expect(isValidEmail('a@b.c')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('user')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user @domain.com')).toBe(false);
  });
});

describe('isValidPinCode', () => {
  it('validates correct Indian PIN codes', () => {
    expect(isValidPinCode('110001')).toBe(true);
    expect(isValidPinCode('500034')).toBe(true);
    expect(isValidPinCode('999999')).toBe(true);
  });

  it('rejects invalid PIN codes', () => {
    expect(isValidPinCode('000000')).toBe(false);
    expect(isValidPinCode('12345')).toBe(false);
    expect(isValidPinCode('1234567')).toBe(false);
    expect(isValidPinCode('0123456')).toBe(false);
    expect(isValidPinCode('')).toBe(false);
  });
});

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('contains a timestamp component', () => {
    const id = generateId();
    const timestampPart = id.split('-')[0];
    const ts = parseInt(timestampPart, 10);
    expect(ts).toBeGreaterThan(0);
    expect(ts).toBeLessThanOrEqual(Date.now());
  });
});

describe('formatDate', () => {
  it('formats date in short format', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date, 'short');
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });

  it('formats date in long format', () => {
    const date = new Date('2024-06-20T14:45:00Z');
    const result = formatDate(date, 'long');
    expect(result).toContain('2024');
    expect(result).toContain('June');
  });

  it('accepts string dates', () => {
    const result = formatDate('2024-03-10T08:00:00Z', 'short');
    expect(result).toContain('2024');
  });

  it('defaults to short format', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date);
    expect(result).toContain('Jan');
  });
});

describe('timeAgo', () => {
  it('returns "Just now" for recent dates', () => {
    const now = new Date();
    expect(timeAgo(now)).toBe('Just now');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toBe('5 minutes ago');
  });

  it('returns singular unit', () => {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    expect(timeAgo(oneHourAgo)).toBe('1 hour ago');
  });

  it('returns days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000);
    expect(timeAgo(threeDaysAgo)).toBe('3 days ago');
  });

  it('returns weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400 * 1000);
    expect(timeAgo(twoWeeksAgo)).toBe('2 weeks ago');
  });

  it('accepts string dates', () => {
    const longAgo = new Date(Date.now() - 400 * 86400 * 1000).toISOString();
    expect(timeAgo(longAgo)).toBe('1 year ago');
  });
});

describe('truncateText', () => {
  it('returns original text if shorter than max', () => {
    expect(truncateText('hello', 10)).toBe('hello');
    expect(truncateText('', 5)).toBe('');
  });

  it('truncates and adds ellipsis', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
    expect(truncateText('abcdefgh', 3)).toBe('abc...');
  });

  it('returns original if exactly maxLength', () => {
    expect(truncateText('hello', 5)).toBe('hello');
  });
});

describe('calculateOrderTotal', () => {
  it('calculates subtotal from items', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
    ];
    expect(calculateOrderTotal(items)).toBe(250);
  });

  it('applies discount', () => {
    const items = [{ price: 200, quantity: 1 }];
    expect(calculateOrderTotal(items, 20)).toBe(180);
  });

  it('applies tax', () => {
    const items = [{ price: 100, quantity: 1 }];
    expect(calculateOrderTotal(items, 0, 18)).toBe(118);
  });

  it('applies both discount and tax', () => {
    const items = [{ price: 100, quantity: 2 }];
    expect(calculateOrderTotal(items, 10, 20)).toBe(210);
  });

  it('handles empty items', () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});

describe('canTransitionOrderStatus', () => {
  it('allows valid transitions', () => {
    expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransitionOrderStatus(OrderStatus.CONFIRMED, OrderStatus.PREPARING)).toBe(true);
    expect(canTransitionOrderStatus(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
    expect(canTransitionOrderStatus(OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(canTransitionOrderStatus(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
    expect(canTransitionOrderStatus(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
    expect(canTransitionOrderStatus(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
    expect(canTransitionOrderStatus(OrderStatus.READY, OrderStatus.PREPARING)).toBe(false);
  });
});

describe('slugify', () => {
  it('converts text to URL-safe slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('My Great Product!')).toBe('my-great-product');
  });

  it('handles special characters', () => {
    expect(slugify('café & restaurant')).toBe('caf-restaurant');
    expect(slugify('price: $100')).toBe('price-100');
  });

  it('handles multiple spaces and dashes', () => {
    expect(slugify('hello   world')).toBe('hello-world');
    expect(slugify('hello---world')).toBe('hello-world');
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('calculateAverageRating', () => {
  it('calculates average of ratings', () => {
    expect(calculateAverageRating([4, 5, 3, 4, 4])).toBe(4);
    expect(calculateAverageRating([5, 5, 5])).toBe(5);
  });

  it('rounds to one decimal place', () => {
    expect(calculateAverageRating([4, 5, 3])).toBe(4);
    expect(calculateAverageRating([1, 2, 3, 4, 5])).toBe(3);
    expect(calculateAverageRating([4, 4, 5])).toBe(4.3);
  });

  it('returns 0 for empty array', () => {
    expect(calculateAverageRating([])).toBe(0);
  });
});

describe('getInitials', () => {
  it('returns initials from first and last name', () => {
    expect(getInitials('John', 'Doe')).toBe('JD');
    expect(getInitials('rajat', 'verma')).toBe('RV');
  });

  it('returns single initial for first name only', () => {
    expect(getInitials('Alice')).toBe('A');
    expect(getInitials('bob')).toBe('B');
  });

  it('handles empty last name', () => {
    expect(getInitials('Test', '')).toBe('T');
  });
});

describe('deepClone', () => {
  it('creates a deep copy of an object', () => {
    const original = { a: 1, b: { c: 2, d: [3, 4] } };
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.b).not.toBe(original.b);
    expect(clone.b.d).not.toBe(original.b.d);
  });

  it('clones arrays', () => {
    const original = [1, [2, 3], { a: 4 }];
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });

  it('handles primitives', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(null)).toBe(null);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    jest.advanceTimersByTime(200);
    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the debounced function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('groupBy', () => {
  it('groups items by key', () => {
    const items = [
      { category: 'fruit', name: 'apple' },
      { category: 'vegetable', name: 'carrot' },
      { category: 'fruit', name: 'banana' },
    ];
    const result = groupBy(items, 'category');
    expect(result).toEqual({
      fruit: [
        { category: 'fruit', name: 'apple' },
        { category: 'fruit', name: 'banana' },
      ],
      vegetable: [{ category: 'vegetable', name: 'carrot' }],
    });
  });

  it('handles empty array', () => {
    expect(groupBy([], 'key' as never)).toEqual({});
  });

  it('handles single item', () => {
    const items = [{ type: 'a', value: 1 }];
    expect(groupBy(items, 'type')).toEqual({ a: [{ type: 'a', value: 1 }] });
  });
});

describe('isBusinessOpen', () => {
  it('returns true when no operating hours defined', () => {
    expect(isBusinessOpen(undefined)).toBe(true);
    expect(isBusinessOpen(null)).toBe(true);
  });

  it('returns false when current day is closed', () => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = { [dayName]: { open: '09:00', close: '21:00', isClosed: true } };
    expect(isBusinessOpen(hours)).toBe(false);
  });

  it('returns false when day has no hours entry', () => {
    expect(isBusinessOpen({})).toBe(false);
  });

  it('returns true when within operating hours', () => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = { [dayName]: { open: '00:00', close: '23:59' } };
    expect(isBusinessOpen(hours)).toBe(true);
  });

  it('returns false when outside operating hours', () => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = now.getHours();
    // Set hours that exclude current time
    const hours = {
      [dayName]: {
        open: `${((currentHour + 2) % 24).toString().padStart(2, '0')}:00`,
        close: `${((currentHour + 3) % 24).toString().padStart(2, '0')}:00`,
      },
    };
    expect(isBusinessOpen(hours)).toBe(false);
  });
});

describe('sanitizeSearchQuery', () => {
  it('trims and lowercases query', () => {
    expect(sanitizeSearchQuery('  Hello World  ')).toBe('hello world');
    expect(sanitizeSearchQuery('TEST')).toBe('test');
  });

  it('removes special characters', () => {
    expect(sanitizeSearchQuery('hello@world!')).toBe('helloworld');
    expect(sanitizeSearchQuery('price: $100')).toBe('price 100');
  });

  it('preserves alphanumeric and spaces', () => {
    expect(sanitizeSearchQuery('fresh milk 500ml')).toBe('fresh milk 500ml');
  });

  it('handles empty string', () => {
    expect(sanitizeSearchQuery('')).toBe('');
  });
});
