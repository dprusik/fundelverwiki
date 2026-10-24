// Read-only UI projection from the existing validated local article adapter.
const { prepareLocalArticles } = require('../../../src/helpers/wiki/local-articles.cjs');
module.exports = require('../../../src/wiki-ui/organization-view.cjs').organizationViews(prepareLocalArticles(process.cwd()));
