const { Workflow } = require('n8n-workflow');

const nodeType = {
  description: {
    displayName: 'T', name: 'testNode', group: [], version: 1,
    description: '', defaults: {}, inputs: ['main'], outputs: ['main'], properties: [],
  },
};
const nodeTypes = {
  getByName: () => nodeType,
  getByNameAndVersion: () => nodeType,
  getKnownTypes: () => ({}),
};

const wf = new Workflow({
  nodes: [{ id: '1', name: 'X', type: 'testNode', typeVersion: 1, position: [0, 0], parameters: {} }],
  connections: {},
  active: false,
  nodeTypes,
});

const EXPR = '={{ typeof $value === "string" ? $value.parseJson() : $value }}';

function run(label, value) {
  try {
    const out = wf.expression.getParameterValue(
      EXPR, null, 0, 0, 'X', [{ json: {} }], 'manual',
      { $value: value }, undefined, false,
    );
    console.log(label, '=> OK', JSON.stringify(out));
  } catch (e) {
    console.log(label, '=> THROWS', e.constructor.name, '|', e.message);
  }
}

run("empty string (field default '')", '');
run('valid json', '[{"find":"A","replace":"b"}]');
run('trailing comma (LLM)', '[{"find":"A","replace":"b"},]');
run('already an array', [{ find: 'A', replace: 'b' }]);
