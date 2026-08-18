import type { INodeProperties } from 'n8n-workflow';
import { EXAMPLE_EDITS } from './examples/presets';

const showOnly = {
	resource: ['render'],
	operation: ['renderFromExample'],
};

export const renderFromExampleDescription: INodeProperties[] = [
	{
		displayName: 'Example',
		name: 'example',
		type: 'options',
		noDataExpression: true,
		default: 'verticalSocialShort',
		displayOptions: { show: showOnly },
		description: 'A ready-made edit that renders as-is. Pick one, run it, then copy the JSON from the docs into Render From Edit to change it.',
		options: [
			{
				name: 'Vertical Social Short (9:16)',
				value: 'verticalSocialShort',
				description: 'Two clips, animated captions, music. Built for TikTok, Reels and Shorts. The template gallery has no vertical example, and vertical is the most common job.',
				routing: {
					request: {
						body: EXAMPLE_EDITS.verticalSocialShort,
					},
				},
			},
			{
				name: 'Starter: Title, Image and Video',
				value: 'basicEditsTitleImageVideo',
				description: 'The simplest complete edit. Good first render.',
				routing: {
					request: {
						body: EXAMPLE_EDITS.basicEditsTitleImageVideo,
					},
				},
			},
			{
				name: 'Photo Slideshow (Ken Burns)',
				value: 'kenBurnsEffectSlideshow',
				description: 'Stills with slow pan and zoom. Matches the slideshow job.',
				routing: {
					request: {
						body: EXAMPLE_EDITS.kenBurnsEffectSlideshow,
					},
				},
			},
			{
				name: 'Car Sale Slideshow',
				value: 'carSaleSlideshowVideo',
				description: 'Vehicle photos into a dealer advert',
				routing: {
					request: {
						body: EXAMPLE_EDITS.carSaleSlideshowVideo,
					},
				},
			},
			{
				name: 'Car Walkaround',
				value: 'carWalkaroundVideo',
				description: 'Short vehicle walkaround clip',
				routing: {
					request: {
						body: EXAMPLE_EDITS.carWalkaroundVideo,
					},
				},
			},
			{
				name: 'Real Estate Listing (with Merge Fields)',
				value: 'realEstateSlideshowSdOverlaysMerge',
				description: 'Property slideshow with 26 placeholders for address, agent, beds and baths. Placeholders: ADDRESS_1, ADDRESS_2, AGENT_NAME, BATHS, BEDS, CARS….',
				routing: {
					request: {
						body: EXAMPLE_EDITS.realEstateSlideshowSdOverlaysMerge,
					},
				},
			},
			{
				name: 'Hotel or Travel Slideshow',
				value: 'hotelReviewSlideshow',
				description: 'Accommodation and travel promotion',
				routing: {
					request: {
						body: EXAMPLE_EDITS.hotelReviewSlideshow,
					},
				},
			},
			{
				name: 'Kinetic Text',
				value: 'kineticText',
				description: 'Animated word-by-word text. No footage needed.',
				routing: {
					request: {
						body: EXAMPLE_EDITS.kineticText,
					},
				},
			},
			{
				name: 'News Summary Video',
				value: 'infoNewsSummaryVideo',
				description: 'Headline video from a data feed. Matches the text-video job. Placeholders: HIGHLITE_COLOR, LOWER_THIRD_PANEL.',
				routing: {
					request: {
						body: EXAMPLE_EDITS.infoNewsSummaryVideo,
					},
				},
			},
			{
				name: 'Health and Wellbeing Advert',
				value: 'healthWellbeingPromotion',
				description: 'Lifestyle promotion with music',
				routing: {
					request: {
						body: EXAMPLE_EDITS.healthWellbeingPromotion,
					},
				},
			},
		],
	},
	{
		displayName: 'Callback URL',
		name: 'callback',
		type: 'string',
		default: '',
		placeholder: 'https://your-n8n/webhook/shotstack-done',
		displayOptions: { show: showOnly },
		description:
			'Shotstack posts the finished render here. Point it at an n8n Webhook node so the workflow continues on its own, instead of waiting and polling.',
		routing: {
			send: {
				type: 'body',
				property: 'callback',
				// Send undefined rather than '' when blank, so it cannot overwrite a
				// callback already present in the example edit.
				value: '={{ $value || undefined }}',
			},
		},
	},
];
