package org.visallo.ingestontologymapping.util.mapping;

import org.json.JSONArray;
import org.json.JSONObject;
import org.vertexium.Authorizations;
import org.visallo.core.model.ontology.OntologyRepository;
import org.visallo.core.security.VisibilityTranslator;
import org.visallo.ingestontologymapping.model.MappingErrors;

import java.util.ArrayList;
import java.util.List;

public class ParseMapping {
    public List<VertexMapping> vertexMappings = new ArrayList<>();
    public List<EdgeMapping> edgeMappings = new ArrayList<>();

    public ParseMapping(OntologyRepository ontologyRepository, VisibilityTranslator visibilityTranslator, String workspaceId, String jsonMapping) {
        this(ontologyRepository, visibilityTranslator, workspaceId, new JSONObject(jsonMapping));
    }

    public ParseMapping(OntologyRepository ontologyRepository, VisibilityTranslator visibilityTranslator, String workspaceId, JSONObject jsonMapping) {
        JSONArray jsonVertexMappings = jsonMapping.getJSONArray("vertices");
        for (int i = 0; i < jsonVertexMappings.length(); i++) {
            vertexMappings.add(new VertexMapping(ontologyRepository, visibilityTranslator, workspaceId, jsonVertexMappings.getJSONObject(i)));
        }

        JSONArray jsonEdgeMappings = jsonMapping.getJSONArray("edges");
        for (int i = 0; i < jsonEdgeMappings.length(); i++) {
            edgeMappings.add(new EdgeMapping(visibilityTranslator, workspaceId, jsonEdgeMappings.getJSONObject(i)));
        }
    }

    public MappingErrors validate(Authorizations authorizations) {
        MappingErrors errors = new MappingErrors();

        for (VertexMapping vertexMapping : vertexMappings) {
            MappingErrors vertexMappingErrors = vertexMapping.validate(authorizations);
            errors.mappingErrors.addAll(vertexMappingErrors.mappingErrors);
        }

        for (EdgeMapping edgeMapping : edgeMappings) {
            MappingErrors edgeMappingErrors = edgeMapping.validate(authorizations);
            errors.mappingErrors.addAll(edgeMappingErrors.mappingErrors);
        }

        return errors;
    }
}
