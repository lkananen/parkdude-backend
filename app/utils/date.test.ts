import {getDateRange} from './date';


describe('Date util', () => {
  describe('getDateRange', () => {
    test('Returns dates in range', () => {
      expect(
        getDateRange(new Date('2019-11-01'), new Date('2019-11-05'))
      ).toEqual(
        ['2019-11-01', '2019-11-02', '2019-11-03', '2019-11-04', '2019-11-05']
      );
    });

    test('Returns dates in range (month/year change)', () => {
      expect(
        getDateRange(new Date('2019-12-31'), new Date('2020-01-02'))
      ).toEqual(
        ['2019-12-31', '2020-01-01', '2020-01-02']
      );
    });

    test('Works with single date', () => {
      expect(
        getDateRange(new Date('2019-11-01'), new Date('2019-11-01'))
      ).toEqual(
        ['2019-11-01']
      );
    });

    test('Works with leap day', () => {
      expect(
        getDateRange(new Date('2016-02-27'), new Date('2016-03-01'))
      ).toEqual(
        ['2016-02-27', '2016-02-28', '2016-02-29', '2016-03-01']
      );
    });
  });
});
