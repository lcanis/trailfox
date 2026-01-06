import * as http from '../http';
import { RouteService } from '../routeService';

describe('RouteService search sanitization', () => {
  beforeEach(() => {
    jest.spyOn(http, 'fetchJsonWithTimeout').mockResolvedValue({ data: [], count: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes quotes from search query in fetchRoutes', async () => {
    await RouteService.fetchRoutes(0, 20, null, 'König "Ludwig\'');

    expect(http.fetchJsonWithTimeout).toHaveBeenCalledTimes(1);
    const calledUrl = (http.fetchJsonWithTimeout as jest.Mock).mock.calls[0][0] as string;

    // Ensure encoded double/single quotes (%22 / %27) are not present
    expect(calledUrl).not.toMatch(/%22|%27/);
    // Ensure the utf8 characters and space remained encoded
    expect(calledUrl).toMatch(/K%C3%B6nig%20Ludwig/);
    // The PostgREST ilike wrapper wildcards should still be present
    expect(calledUrl).toMatch(/name=ilike\.\*/);
  });

  it('removes quotes from search query in fetchRoutesInBbox', async () => {
    await RouteService.fetchRoutesInBbox(0, 0, 1, 1, 20, 0, null, 'Foo\'"Bar');

    expect(http.fetchJsonWithTimeout).toHaveBeenCalledTimes(1);
    const calledUrl = (http.fetchJsonWithTimeout as jest.Mock).mock.calls[0][0] as string;

    // The search_query parameter should not contain encoded quotes
    expect(calledUrl).not.toMatch(/%22|%27/);
    // The sanitized content (FooBar) should be present encoded
    expect(calledUrl).toMatch(/search_query=FooBar/);
  });
});
