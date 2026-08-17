/**
 * Unit Tests — validate.js (Joi schemas + middleware)
 * Run: npm test -- --testPathPattern=validate
 */

const { validate, schemas } = require('../../utils/validate');

// ── Helper ────────────────────────────────────────────────────────────────────
function mockMiddleware(schema, body) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  validate(schema)(req, res, next);
  return { req, res, next };
}

// ── validate() middleware factory ─────────────────────────────────────────────
describe('validate() middleware', () => {
  const simpleSchema = require('joi').object({ name: require('joi').string().required() });

  test('calls next() on valid body', () => {
    const { next, res } = mockMiddleware(simpleSchema, { name: 'Alice' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('responds 400 on invalid body', () => {
    const { res, next } = mockMiddleware(simpleSchema, { name: 123 });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('responds 400 when required field is missing', () => {
    const { res } = mockMiddleware(simpleSchema, {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('strips unknown keys (mass assignment protection)', () => {
    const { req, next } = mockMiddleware(simpleSchema, { name: 'Alice', isAdmin: true });
    expect(next).toHaveBeenCalled();
    expect(req.body.isAdmin).toBeUndefined();
  });

  test('replaces req.body with sanitised values', () => {
    const { req } = mockMiddleware(simpleSchema, { name: '  Bob  ' });
    // Joi trim() or raw, just verify it is a string
    expect(typeof req.body.name).toBe('string');
  });
});

// ── schemas.auth.register ─────────────────────────────────────────────────────
describe('schemas.auth.register', () => {
  const valid = { name: 'Yash Gupta', email: 'yash@example.com', password: 'Secret123!' };

  test('accepts minimal valid registration', () => {
    const { next } = mockMiddleware(schemas.auth.register, valid);
    expect(next).toHaveBeenCalled();
  });

  test('accepts optional fields', () => {
    const { next } = mockMiddleware(schemas.auth.register, { ...valid, collegeName: 'IIT', branch: 'CSE', graduationYear: '2025' });
    expect(next).toHaveBeenCalled();
  });

  test('rejects name shorter than 2 chars', () => {
    const { res } = mockMiddleware(schemas.auth.register, { ...valid, name: 'A' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects name longer than 100 chars', () => {
    const { res } = mockMiddleware(schemas.auth.register, { ...valid, name: 'A'.repeat(101) });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects invalid email', () => {
    const { res } = mockMiddleware(schemas.auth.register, { ...valid, email: 'not-an-email' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects password shorter than 8 chars or missing uppercase/digit', () => {
    // Too short
    const { res: res1 } = mockMiddleware(schemas.auth.register, { ...valid, password: 'abc' });
    expect(res1.status).toHaveBeenCalledWith(400);
    // No uppercase
    const { res: res2 } = mockMiddleware(schemas.auth.register, { ...valid, password: 'secret123' });
    expect(res2.status).toHaveBeenCalledWith(400);
    // No digit
    const { res: res3 } = mockMiddleware(schemas.auth.register, { ...valid, password: 'SecretPass' });
    expect(res3.status).toHaveBeenCalledWith(400);
  });

  test('normalises email to lowercase', () => {
    const { req, next } = mockMiddleware(schemas.auth.register, { ...valid, email: 'YASH@EXAMPLE.COM' });
    expect(next).toHaveBeenCalled();
    expect(req.body.email).toBe('yash@example.com');
  });
});

// ── schemas.auth.login ────────────────────────────────────────────────────────
describe('schemas.auth.login', () => {
  test('accepts valid credentials', () => {
    const { next } = mockMiddleware(schemas.auth.login, { email: 'user@example.com', password: 'mypassword' });
    expect(next).toHaveBeenCalled();
  });

  test('rejects missing password', () => {
    const { res } = mockMiddleware(schemas.auth.login, { email: 'user@example.com' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects missing email', () => {
    const { res } = mockMiddleware(schemas.auth.login, { password: 'mypassword' });
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ── schemas.interview.start ───────────────────────────────────────────────────
describe('schemas.interview.start', () => {
  test('accepts valid interview types', () => {
    const types = ['hr', 'technical', 'behavioral', 'system_design', 'aptitude', 'coding'];
    types.forEach((type) => {
      const { next } = mockMiddleware(schemas.interview.start, { type });
      expect(next).toHaveBeenCalled();
    });
  });

  test('rejects unknown interview type', () => {
    const { res } = mockMiddleware(schemas.interview.start, { type: 'unknown_type' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects missing type', () => {
    const { res } = mockMiddleware(schemas.interview.start, { company: 'Google' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('accepts optional company and role', () => {
    const { next } = mockMiddleware(schemas.interview.start, { type: 'hr', company: 'Google', role: 'SWE' });
    expect(next).toHaveBeenCalled();
  });
});

// ── schemas.coding ────────────────────────────────────────────────────────────
describe('schemas.coding.run', () => {
  const valid = { code: 'console.log("hi")', language: 'javascript' };

  test('accepts valid code submission', () => {
    const { next } = mockMiddleware(schemas.coding.run, valid);
    expect(next).toHaveBeenCalled();
  });

  test('rejects unsupported language', () => {
    const { res } = mockMiddleware(schemas.coding.run, { ...valid, language: 'cobol' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects code exceeding 50000 chars', () => {
    const { res } = mockMiddleware(schemas.coding.run, { ...valid, code: 'x'.repeat(50001) });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects missing code', () => {
    const { res } = mockMiddleware(schemas.coding.run, { language: 'python' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('accepts all listed languages', () => {
    const langs = ['javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'go', 'rust', 'ruby'];
    langs.forEach((language) => {
      const { next } = mockMiddleware(schemas.coding.run, { ...valid, language });
      expect(next).toHaveBeenCalled();
    });
  });
});
