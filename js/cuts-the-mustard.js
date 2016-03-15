function cutsTheMustard() {
    return (
        document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1') &&
        'querySelector' in document &&
        'localStorage' in window &&
        'addEventListener' in window
    );
}
