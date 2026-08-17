import type { INodeProperties } from 'n8n-workflow';

const showOnly = {
	resource: ['render'],
	operation: ['renderFromJson'],
};

const SAMPLE_EDIT = `{
  "timeline": {
    "tracks": [
      {
        "clips": [
          {
            "asset": { "type": "text", "text": "Hello from n8n" },
            "start": 0,
            "length": 4
          }
        ]
      }
    ]
  },
  "output": { "format": "mp4", "size": { "width": 1080, "height": 1920 } }
}`;

export const renderFromJsonDescription: INodeProperties[] = [
	{
		displayName: 'Edit',
		name: 'edit',
		type: 'json',
		required: true,
		default: SAMPLE_EDIT,
		typeOptions: { rows: 12 },
		displayOptions: { show: showOnly },
		description:
			'The full Shotstack edit: a timeline of tracks and clips, plus output settings. Paste one from the docs or Studio. Keep this field in fixed mode — in expression mode n8n evaluates Shotstack merge placeholders such as {{ HEADLINE }} and replaces them with nothing.',
		routing: {
			request: {
				// parseJson reports a bad edit as a real n8n error. A bare JSON.parse
				// throws a SyntaxError that the expression engine swallows, which sends
				// the request with no edit at all and an opaque API error back.
				body: '={{ typeof $value === "string" ? $value.parseJson() : $value }}',
			},
		},
	},
	{
		displayName: 'Callback URL',
		name: 'callback',
		type: 'string',
		default: '',
		placeholder: 'https://your-n8n/webhook/shotstack-done',
		displayOptions: { show: showOnly },
		description: 'Shotstack posts the finished render here. Point it at an n8n Webhook node so the workflow continues on its own, instead of waiting and polling. Leave blank if your edit already sets its own callback.',
		routing: {
			send: {
				type: 'body',
				property: 'callback',
				// Send undefined rather than '' when blank. Otherwise this merges an
				// empty string over a callback the user set inside their own edit,
				// silently breaking their webhook.
				value: '={{ $value || undefined }}',
			},
		},
	},
];
