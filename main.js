import { JSDOM } from 'jsdom';
import { fstat, writeFileSync } from 'fs';

const { document } = new JSDOM(
  await (
    await fetch(
      'https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E3%81%AE%E4%BC%81%E6%A5%AD%E4%B8%80%E8%A6%A7'
    )
  ).text()
).window;

const genreUrls = [
  ...document.querySelectorAll(
    '#mw-content-text > div.mw-parser-output > table > tbody > tr > td > a'
  ),
].map(({ href }) => new URL(href, 'https://ja.wikipedia.org').href);

const urls = (
  await Promise.all(
    genreUrls.map(async (genreUrl) => {
      console.log(genreUrl);
      const { document } = new JSDOM(await (await fetch(genreUrl)).text())
        .window;
      return [
        ...document.querySelectorAll(
          '#mw-content-text > div.mw-parser-output > ul > li a'
        ),
      ]
        .filter(({ title }) => !title.includes('日本の企業一覧'))
        .filter(({ href }) => href.startsWith('/wiki'))
        .map(({ href }) => new URL(href, 'https://ja.wikipedia.org').href);
    })
  )
).flat();

const len = 20;
const splittedUrls = urls.reduce(
  (a, v, i) => (i % len ? a : [...a, urls.slice(i, i + len)]),
  []
);

const companyNames = [];
for (let i = 0; i < splittedUrls.length; i++) {
  // for (const urls of splittedUrls) {
  console.log(`${(i / splittedUrls.length) * 100}%`);
  companyNames.push(
    ...(
      await Promise.all(
        splittedUrls[i].map(async (url) => {
          const { document } = new JSDOM(
            await (
              await fetch(url).catch(() => {
                console.log(url);
                process.exit(1);
              })
            ).text()
          ).window;
          const enName =
            document.querySelector(
              '#mw-content-text > div.mw-parser-output > table.infobox.plainlist > caption > span'
            )?.textContent ?? '';
          const escapeEnName = `"${enName}"`;
          const jaNames = document
            .querySelector(
              '#mw-content-text > div.mw-parser-output > table.infobox.plainlist > caption'
            )
            ?.textContent.replace(enName, '');
          const companyUrl = document.querySelector(
            '#mw-content-text > div.mw-parser-output > table.infobox.plainlist > tbody > tr > td > span > a.external.free'
          )?.href;
          const companyAliasName =
            document.querySelector('#firstHeading > span')?.textContent ?? '';
          return [jaNames, companyAliasName, escapeEnName, companyUrl];
        })
      )
    ).filter(
      ([jaNames, companyAliasName, enName, companyUrl]) =>
        companyUrl != undefined
    )
  );
}

const csvString = companyNames.map((list) => list.join()).join('\n');
writeFileSync('companyUrlPulsAlias.csv', csvString);
