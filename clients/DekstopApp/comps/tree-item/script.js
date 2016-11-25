(function(name){
    app.directive(name, function() {
        hyphenCase = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        
        return {
            restrict: 'E',
            scope: {
                 "name": '@'
                ,"isFolder": '@'
            },
            "transclude": true,
            templateUrl: 'comps/' + hyphenCase + '/markup.html',
        };
    });    
    
})("treeItem");

