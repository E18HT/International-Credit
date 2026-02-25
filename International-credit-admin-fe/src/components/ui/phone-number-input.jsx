import React from "react";
import { Controller } from "react-hook-form";
import { Label } from "./label";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { countries } from "@/utils/country";
const countryCodes = [...countries];
const PhoneNumberInput = ({
  control,
  name,
  label = "Phone Number",
  placeholder = "1234567890",
  required = false,
  errors = {},
  className = "",
  countryCodeName = "countryCode",
  phoneNumberName = "phoneNumber",
  defaultCountryCode = "61",
}) => {
  return (
    <div className={`${className}`}>
      <Label htmlFor={name}>
        {label} {required && "*"}
      </Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <Controller
            name={countryCodeName}
            control={control}
            defaultValue={defaultCountryCode}
            rules={{
              required: required ? "Country code is required" : false,
            }}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  className={`h-9 ${
                    errors[countryCodeName] ? "border-red-500" : ""
                  }`}
                >
                  <SelectValue placeholder="Code" />
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.map((country, i) => (
                    <SelectItem key={i} value={country.code}>
                      {country.ISO} +{country.code} ({country.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Controller
            name={phoneNumberName}
            control={control}
            rules={{
              required: required ? "Phone number is required" : false,
              pattern: {
                value: /^[\d\s\-\(\)]{7,15}$/,
                message: "Please enter a valid phone number",
              },
            }}
            render={({ field }) => (
              <Input
                {...field}
                id={name}
                placeholder={placeholder}
                className={errors[phoneNumberName] ? "border-red-500" : ""}
              />
            )}
          />
        </div>
      </div>
      {errors[countryCodeName] && (
        <p className="text-red-500 text-sm mt-1">
          {errors[countryCodeName].message}
        </p>
      )}
      {errors[phoneNumberName] && (
        <p className="text-red-500 text-sm mt-1">
          {errors[phoneNumberName].message}
        </p>
      )}
    </div>
  );
};

export default PhoneNumberInput;
