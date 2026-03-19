import '@testing-library/jest-dom';

if (typeof process !== 'undefined') {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.AUTH_PEPPER = process.env.AUTH_PEPPER || 'test-pepper';
}
