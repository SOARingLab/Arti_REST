'use strict';

angular.module('artirestApp')
    .controller('ProcessModelDetailController', function ($scope, $rootScope, $state, $stateParams, $timeout, $http, $uibModal, ParseLinks, entity, ProcessModel,ArtifactModel, Process, ProcessOfModel) {
        $scope.processModel = entity;
        $scope.processes = {}
        $scope.instances = {};
        $scope.predicate = 'createdAt';
        $scope.reverse = false;
        $scope.page = 1;
        $scope.loadAll = function(id) {
            console.log(id);
            ProcessOfModel.query({page: $scope.page - 1, size: 10, sort: [$scope.predicate + ',' + ($scope.reverse ? 'asc' : 'desc')]}, function(result, headers) {
                $scope.links = ParseLinks.parse(headers('link'));
                $scope.totalItems = headers('X-Total-Count');
                $scope.processes = result;
                console.log(result);
                console.log($scope.links);
                console.log("哈哈");
                console.log($scope.totalItems);
            });
        };

        $scope.load = function (id) {
            ProcessModel.get({id: id}, function(result) {
                $scope.processModel = result;
                //console.log($scope.processModel);
                //$timeout($scope.showStatesFlowcharts(), 1000);
                setTimeout(function(){
                    $scope.showStatesFlowcharts();
                }, 1);

                $scope.loadInstances(); //从后台加载实例
            });
        };


        $scope.load($stateParams.id);
        //$scope.loadAll($stateParams.id);

        $scope.deleteInstance = function (id) {
            Process.delete({id: id}, function (result) {
                $scope.loadInstances();
            });
        };

        $scope.parseLifeCycle = function(artifact){
            var key = 'myDiagram-'+artifact.id;
            var json = eval('('+myDiagrams[key].model.toJson() + ')');
            console.log(json);
            var states = [];
            var stateKeyMap = {};
            for(var i=0;i<json.nodeDataArray.length;i++){
                var n = json.nodeDataArray[i];
                var state = {
                    name: n.text,
                    type: n.category ? (n.category == 'Start' ? 'START' : 'FINAL') : 'NORMAL',
                    comment: n.text,
                    nextStates: []
                };
                states.push(state);
                stateKeyMap[n.key] = i;
            }

            for(var i=0;i<json.linkDataArray.length;i++){
                var link = json.linkDataArray[i];
                states[stateKeyMap[link.from]].nextStates.push(states[stateKeyMap[link.to]].name);
            }
            return states;
        };

        $scope.saveEditArtifact = function(artifact){
            artifact.states = $scope.parseLifeCycle(artifact);
            $scope.saveArtifact(artifact);
        };

        $scope.loadInstances = function(){
            $http.get('/api/processModels/'+$scope.processModel.id+'/processes') //从后台ProcessResource拿数据
                .then(function(res){
                    $scope.instances = res.data;
                }, function(res){

                });
        };

        $scope.attrTypes = ['String','Long','Integer',"Double",'Float','Text','Date'];

        $scope.saveArtifact = function(artifact){
            console.log(artifact);
            ArtifactModel.update(artifact, function(res){

            }, function(res){});
        };

        $scope.newAttr = {name: null, type: null, comment: null};
        $scope.addAttr = function(artifact){
            if($scope.newAttr.name && $scope.newAttr.type && $scope.newAttr.comment){
                artifact.attributes.push($scope.newAttr);
               // $scope.saveArtifact(artifact);
                $scope.newAttr = {name: null, type: null, comment: null};
            }
        };


        $scope.removeAttr = function(artifact, attr){
            var idx =artifact.attributes.indexOf(attr);
            if(idx!=-1){
                artifact.attributes.splice(idx,1); //splice() 方法可删除从 index 处开始的零个或多个元素
                //$scope.saveArtifact(artifact);
            }
        };

        $scope.editService = function(service){
            var idx = $scope.processModel.services.indexOf(service);
            $uibModal.open({
                               templateUrl: 'scripts/app/entities/service/service-dialog.html',
                               controller: 'ServiceDialogController',
                               size: 'lg',
                               resolve: {
                                   entity: service
                               }
                           }).result.then(function(result) {
                $scope.processModel.services[idx] = result;
                $scope.saveServices();
            }, function() {
            });
        };

        $scope.newService = function(){
            $uibModal.open({
                               templateUrl: 'scripts/app/entities/service/service-dialog.html',
                               controller: 'ServiceDialogController',
                               size: 'lg',
                               resolve: {
                                   entity: function () {
                                       return {
                                           name: null,
                                           method: null,
                                           url: null,
                                           inputArtifact: null,
                                           outputArtifact: null,
                                           inputParams: null,
                                           type: 'HUMAN_TASK',
                                           id: null
                                       };
                                   }
                               }
                           }).result.then(function(result) {
                var artifactName = $scope.processModel.artifacts[0].name;
                result.inputArtifact = result.outputArtifact = artifactName;
                if(!$scope.processModel.services)
                    $scope.processModel.services = [];

                $scope.processModel.services.push(result);
                $scope.saveServices();
            }, function() {
            });
        };

        $scope.newBusinessRule = function(){
            $uibModal.open({
                               templateUrl: 'scripts/app/entities/businessRuleModel/business-rule-dialog.html',
                               controller: 'BusinessRuleModelDialogController',
                               size: 'lg',
                               resolve: {
                                   entity: function () {
                                       return {
                                           name: null,
                                           action: {name: null, service: null,transitions: []},
                                           preConditions: [],
                                           postConditions: []
                                       };
                                   },
                                   processModel: $scope.processModel
                               }
                           }).result.then(function(result) {

                $scope.processModel.businessRules.push(result);
                $scope.saveBusinessRules();
            }, function(){});
        };

        $scope.editBusinessRule = function(rule){
            var idx = $scope.processModel.businessRules.indexOf(rule);

            $uibModal.open({
                               templateUrl: 'scripts/app/entities/businessRuleModel/business-rule-dialog.html',
                               controller: 'BusinessRuleModelDialogController',
                               size: 'lg',
                               resolve: { entity: rule, processModel: $scope.processModel}
                           }).result.then(function(result) {

                $scope.processModel.businessRules[idx] = result;
                $scope.saveBusinessRules();
            }, function(){});
        };

        $scope.removeBusinessRule = function(rule){
            var idx = $scope.processModel.businessRules.indexOf(rule);
            if(idx === -1)
                return;
            if(!confirm("Are you sure?"))
                return;
            $scope.processModel.businessRules.splice(idx,1);
            $scope.saveBusinessRules();
        };

        $scope.saveBusinessRules = function(){
            $http.post('/api/processModels/'+$stateParams.id+'/businessRules', $scope.processModel.businessRules)
                .then(function(res){}, function(res){});
        };
        $scope.saveServices = function(){
          $http.post('/api/processModels/'+$stateParams.id+'/services', $scope.processModel.services)
              .then(function(res){}, function(res){});
        };

        $scope.removeService = function(service){
          if(!confirm('Are you sure?'))
          return;
          var idx = $scope.processModel.services.indexOf(service);
          if(idx !== -1){
             $scope.processModel.services.splice(idx, 1);
          }
            $scope.saveServices();
        };

        $scope.toggleEditAttr = function(artifact, attr){
            var idx = artifact.attributes.indexOf(attr);
            if(idx==-1) return;
            var key = '#artifact-'+artifact.id + ' tr.artifact-attr';
            var attrRow = $(key)[idx];
        };

        $scope.createProcessInstance = function(){
            $http.post('/api/processModels/'+$scope.processModel.id+'/processes', {})
                .then(function(res){
                    console.log(res);
                    $scope.loadInstances();
                }, function(res){

                });
        };

        var unsubscribe = $rootScope.$on('artirestApp:processModelUpdate', function(event, result) {
            $scope.processModel = result;
        });

        $scope.$on('$destroy', unsubscribe);
        $scope.key = 0;

        $scope.addNode = function(nodes, edges, states, state, x, y, fromKey){ //递归函数
            var node = {
                "key" : $scope.key++,
                "text" : state["comment"],
                "loc" : "" + (x + 130) + " " + y
            };

            if(state["type"] == 'START')
                node["category"] = "Start";
            else if(state["type"] == 'FINAL')
                node["category"] = "End";

            nodes.push(node);


            if(state["type"] != "START"){
                edges.push({
                               "from" : fromKey,
                               "to" : node.key,
                               "fromPort" : x < 100 && state["type"] != "START" ? "B" : "R",
                               "toPort" : "L",
                               "text": 'r1'
                           });
            }

            var maxWidth = $(".artifact-list").width();

            var fromKey = $scope.key - 1;
            for (var i = 0; i < state.nextStates.length; i++) {　//找出该状态的下一个状态(可能是0或者多个)，需通过遍历找出对应的state数组
                for(var j=0;j<states.length;j++){
                    if(states[j]["name"] == state.nextStates[i]){
                        if(x+280>maxWidth)
                            $scope.addNode(nodes, edges, states, states[j], 20, y + 100 * i + 100, fromKey);
                        else
                            $scope.addNode(nodes, edges, states, states[j], x + 130, y + 100 * i, fromKey);

                    }
                }
            }
        };

        $scope.showStatesFlowcharts = function(){
            $scope.artifacts = $scope.processModel.artifacts;
            for (var i = 0; i < $scope.artifacts.length; i++) {
                var artifact = $scope.artifacts[i];
                var start;
                var states = artifact.states;

                //找到初始状态
                for (var j = 0; j < states.length; j++) {
                    var state = states[j];
                    if(state["type"] == 'START'){
                        start = state;
                    }
                };

                var nodes = [];
                var edges = [];

                //找到了，开始放置图形的位置
                if(start)
                    $scope.addNode(nodes, edges, states, start, 0, 70, 0);

                var json = {
                    "class": "go.GraphLinksModel",
                    "linkFromPortIdProperty": "fromPort",
                    "linkToPortIdProperty": "toPort",
                    "nodeDataArray": nodes,
                    "linkDataArray": edges
                };

                console.log(json);

                if (json.nodeDataArray.length < 8) {
                    $("#myDiagram-"+artifact.id).css("height", "200px");
                };

                initFlowchart("myDiagram-"+artifact.id);
                loadFlowchartFromJson("myDiagram-"+artifact.id, json);
            };
        };


    });
