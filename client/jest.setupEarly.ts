// Run before modules are loaded to silence noisy logs printed during module import

jest.spyOn(console, 'log').mockImplementation(() => undefined);
