package org.visallo.ingestontologymapping.util.mapping;

import org.apache.commons.lang.StringUtils;
import org.json.JSONObject;
import org.visallo.core.exception.VisalloException;
import org.visallo.core.model.ontology.OntologyProperty;
import org.visallo.core.security.VisibilityTranslator;
import org.visallo.web.clientapi.model.PropertyType;

import java.text.NumberFormat;
import java.text.ParseException;

public class NumericPropertyMapping extends PropertyMapping {
    private NumberFormat numberFormat;

    public NumericPropertyMapping(
            OntologyProperty ontologyProperty, VisibilityTranslator visibilityTranslator, String workspaceId, JSONObject propertyMapping) {
        super(visibilityTranslator, workspaceId, propertyMapping);
        numberFormat = ontologyToNumberFormat(ontologyProperty);
    }

    private NumberFormat ontologyToNumberFormat(OntologyProperty ontologyProperty) {
        PropertyType dataType = ontologyProperty.getDataType();
        if(dataType == PropertyType.INTEGER) {
            return NumberFormat.getIntegerInstance();
        } else {
            return NumberFormat.getNumberInstance();
        }
    }

    @Override
    public Object decodeValue(String rawPropertyValue) {
        if (rawPropertyValue != null && !StringUtils.isBlank(rawPropertyValue.replaceAll("\\D", ""))) {
            try {
                return numberFormat.parse(rawPropertyValue.replaceAll("[^\\d\\.,\\-]", "").replaceAll("(?<!^)\\-", ""));
            } catch (ParseException pe) {
                throw new VisalloException("Unrecognized number format: " + rawPropertyValue, pe);
            }
        }

        return null;
    }
}
