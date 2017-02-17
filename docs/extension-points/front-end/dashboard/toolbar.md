## Dashboard Toolbar Items

### Example

```js
registry.registerExtension('org.visallo.dashboard.toolbar.item', {
    identifier: 'com-example-toolbar',

    // Only add toolbar to my other custom card
    canHandle: function(options) {
        return options.extension.identifier === 'com-example-my-card'
    },
    tooltip: 'My Example Action',
    icon: 'myIcon.png',
    action: {
        type: 'popover',
        componentPath: 'com/example/toolbar/configComponent'
    }
});
```

