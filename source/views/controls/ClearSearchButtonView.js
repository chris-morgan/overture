import { Class } from '../../core/Core';
import ButtonView from './ButtonView';

const ClearSearchButtonView = Class({

    Extends: ButtonView,

    className: 'v-ClearSearchButton',
    layerStyles: {
        position: 'absolute',
    },
    shortcut: 'Ctrl-/',
});

export default ClearSearchButtonView;
